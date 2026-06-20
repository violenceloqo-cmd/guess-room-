import { EventEmitter } from "node:events";
import {
  ROOM_COUNT,
  type RoundPublic,
  type RoundResultPublic,
  type PayoutPublic,
  type RoundStatus,
} from "@guess-room/shared";
import { createLogger } from "../util/logger.js";
import { buildEliminationOrder } from "./rng.js";
import type {
  ComputedPayout,
  EngineConfig,
  EngineDeps,
  EnginePersistence,
  GuessResult,
  RoundData,
  SettlementOutcome,
} from "./types.js";
import {
  addGuessToRound,
  createRound,
  toRoundPublic,
  walletsForRoom,
} from "./round.js";

const log = createLogger("engine");

export interface EngineSnapshot {
  running: boolean;
  currentRound: RoundPublic | null;
  lastResult: RoundResultPublic | null;
  serverTime: string;
}

export interface GameEngineEvents {
  "round:open": (round: RoundPublic) => void;
  "round:lock": (round: RoundPublic) => void;
  "round:eliminate": (round: RoundPublic) => void;
  "round:settling": (round: RoundPublic) => void;
  "round:settled": (result: RoundResultPublic) => void;
  "guess": (round: RoundPublic) => void;
  "state": (snapshot: EngineSnapshot) => void;
}

/** Map internal status to a value the DB's CHECK constraint accepts. */
function dbStatus(status: RoundStatus): "open" | "locked" | "settling" | "settled" {
  return status === "eliminating" ? "locked" : status;
}

/**
 * Authoritative, in-memory round loop. Pure of any I/O — time, randomness, and
 * settlement are injected so the whole lifecycle is deterministically testable.
 * Drive it with `tick()` (a real interval in production, manual calls in tests).
 */
export class GameEngine extends EventEmitter {
  private running = false;
  private current: RoundData | null = null;
  private lastResult: RoundResultPublic | null = null;
  private roundCounter = 0;
  private carryoverLamports = 0n;
  private busy = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private config: EngineConfig,
    private readonly deps: EngineDeps,
  ) {
    super();
  }

  /** Current engine config (pool, durations, rollover). */
  getConfig(): EngineConfig {
    return { ...this.config };
  }

  /** Update config live. Pool/duration changes take effect on the next round. */
  updateConfig(patch: Partial<EngineConfig>): EngineConfig {
    this.config = { ...this.config, ...patch };
    log.info("config updated", this.config);
    this.emitState();
    return this.getConfig();
  }

  /**
   * Start the loop and open the first round. By default a background interval
   * drives `tick()`; pass `autoTick: false` to drive it manually (tests).
   * Returns once the first round has been persisted (when a store is wired).
   */
  async start(opts: { tickMs?: number; autoTick?: boolean } = {}): Promise<void> {
    if (this.running) return;
    const { tickMs = 250, autoTick = true } = opts;
    this.running = true;
    this.carryoverLamports = 0n;
    log.info("engine started");
    // The sync part of openNextRound sets the in-memory round + emits events
    // immediately; awaiting only blocks on the DB mirror write.
    const opened = this.openNextRound(this.deps.now());
    if (autoTick) {
      this.timer = setInterval(() => {
        void this.tick();
      }, tickMs);
      // Don't keep the process alive solely for the engine timer.
      this.timer.unref?.();
    }
    await opened;
  }

  /** Stop scheduling. The current round is frozen as-is. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    log.info("engine stopped");
    this.emitState();
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Record a wallet's pick into the current round. */
  addGuess(wallet: string, room: number): GuessResult {
    if (!this.running || !this.current) {
      return { accepted: false, reason: "no_active_round" };
    }
    const now = this.deps.now();
    const result = addGuessToRound(this.current, wallet, room, now);
    if (result.accepted) {
      const roundId = this.current.id;
      this.emit("guess", toRoundPublic(this.current));
      this.emitState();
      // Mirror to DB (fire-and-forget): in-memory state is authoritative, so a
      // transient DB hiccup never drops a guess — it's reflected in GET /state.
      void this.persist((p) => p.upsertGuess(roundId, wallet, room, now));
    }
    return result;
  }

  getSnapshot(): EngineSnapshot {
    return {
      running: this.running,
      currentRound: this.current ? toRoundPublic(this.current) : null,
      lastResult: this.lastResult,
      serverTime: new Date(this.deps.now()).toISOString(),
    };
  }

  /**
   * Advance the state machine according to the clock. Re-entrancy is guarded so
   * an in-flight async settlement is never started twice.
   */
  async tick(): Promise<void> {
    if (!this.running || this.busy) return;
    this.busy = true;
    try {
      const now = this.deps.now();
      const r = this.current;
      if (!r) {
        this.openNextRound(now);
        return;
      }
      if (r.status === "open" && now >= r.endsAtMs) {
        this.beginElimination(r, now);
        await this.persist((p) => p.updateRound(r.id, { status: dbStatus(r.status) }));
      }
      if (r.status === "eliminating") {
        this.advanceEliminations(r, now);
        if (r.eliminatedRooms.length >= r.eliminationOrder.length) {
          await this.settleCurrent(now);
        }
      }
    } finally {
      this.busy = false;
    }
  }

  /** Lock picking and pre-roll the (hidden) winner + elimination order. */
  private beginElimination(r: RoundData, now: number): void {
    const winner = this.deps.pickRoom();
    r.pendingWinner = winner;
    r.eliminationOrder = buildEliminationOrder(winner);
    r.eliminatedRooms = [];
    r.status = "eliminating";
    const intervalMs = this.config.eliminationIntervalSeconds * 1000;
    // Schedule from the picking deadline so timing is independent of tick jitter.
    r.nextEliminationAtMs = r.endsAtMs + intervalMs;
    log.info(
      `round ${r.roundNumber} locked (${r.guesses.size} guesses); eliminating ${r.eliminationOrder.length} rooms`,
    );
    this.emit("round:lock", toRoundPublic(r));
    this.emitState();
  }

  /** Knock out any rooms whose scheduled time has passed. */
  private advanceEliminations(r: RoundData, now: number): void {
    const intervalMs = this.config.eliminationIntervalSeconds * 1000;
    let changed = false;
    while (
      r.nextEliminationAtMs !== null &&
      now >= r.nextEliminationAtMs &&
      r.eliminatedRooms.length < r.eliminationOrder.length
    ) {
      const room = r.eliminationOrder[r.eliminatedRooms.length]!;
      r.eliminatedRooms.push(room);
      r.nextEliminationAtMs += intervalMs;
      changed = true;
      log.info(
        `round ${r.roundNumber} eliminated room ${room} (${r.eliminatedRooms.length}/${r.eliminationOrder.length})`,
      );
    }
    if (r.eliminatedRooms.length >= r.eliminationOrder.length) {
      r.nextEliminationAtMs = null;
    }
    if (changed) {
      this.emit("round:eliminate", toRoundPublic(r));
      this.emitState();
    }
  }

  private async openNextRound(now: number): Promise<void> {
    this.roundCounter += 1;
    const pool = this.config.poolLamports + this.carryoverLamports;
    this.carryoverLamports = 0n;
    const round = createRound({
      id: this.deps.newId(),
      roundNumber: this.roundCounter,
      nowMs: now,
      poolLamports: pool,
      config: this.config,
    });
    this.current = round;
    log.info(`round ${this.roundCounter} open (pool ${pool} lamports)`);
    this.emit("round:open", toRoundPublic(round));
    this.emitState();
    await this.persist((p) => p.insertRound(round));
  }

  private async settleCurrent(now: number): Promise<void> {
    const round = this.current;
    if (!round) return;

    round.status = "settling";
    // Winner was pre-rolled at lock and revealed via eliminations; it's the
    // single room never knocked out. Fall back to pickRoom defensively.
    const winningRoom = round.pendingWinner ?? this.deps.pickRoom();
    this.emit("round:settling", toRoundPublic(round));
    log.info(`round ${round.roundNumber} settling, winning room = ${winningRoom}`);
    await this.persist((p) => p.updateRound(round.id, { status: "settling" }));

    const candidateWallets = walletsForRoom(round, winningRoom);

    let outcome: SettlementOutcome;
    try {
      outcome = await this.deps.settlement.settle({
        round,
        winningRoom,
        candidateWallets,
        poolLamports: round.poolLamports,
      });
    } catch (err) {
      log.error(`settlement failed for round ${round.roundNumber}`, err);
      // Fail safe: treat as rolled over so funds are never silently lost.
      outcome = {
        winningRoom,
        poolLamports: round.poolLamports,
        rolledOver: true,
        payouts: [],
      };
    }

    round.winningRoom = winningRoom;
    round.status = "settled";
    this.carryoverLamports = outcome.rolledOver ? outcome.poolLamports : 0n;
    this.lastResult = toRoundResultPublic(round, outcome);

    log.info(
      `round ${round.roundNumber} settled: ${outcome.payouts.length} payout(s), rolledOver=${outcome.rolledOver}`,
    );
    this.emit("round:settled", this.lastResult);
    await this.persist((p) =>
      p.updateRound(round.id, {
        status: "settled",
        winningRoom,
        rolledOver: outcome.rolledOver,
      }),
    );

    // Immediately roll into the next round to keep the stream continuous.
    await this.openNextRound(now);
  }

  /** Run a persistence op if a store is wired, swallowing+logging errors. */
  private async persist(fn: (p: EnginePersistence) => Promise<void>): Promise<void> {
    const p = this.deps.persistence;
    if (!p) return;
    try {
      await fn(p);
    } catch (err) {
      log.error("persistence write failed (state remains correct in memory)", err);
    }
  }

  private emitState(): void {
    this.emit("state", this.getSnapshot());
  }
}

function toPayoutPublic(p: ComputedPayout): PayoutPublic {
  return {
    wallet: p.wallet,
    lamports: p.lamports.toString(),
    status: p.status,
    signature: p.signature,
  };
}

function toRoundResultPublic(
  round: RoundData,
  outcome: SettlementOutcome,
): RoundResultPublic {
  return {
    roundId: round.id,
    roundNumber: round.roundNumber,
    winningRoom: outcome.winningRoom,
    poolLamports: outcome.poolLamports.toString(),
    rolledOver: outcome.rolledOver,
    payouts: outcome.payouts.map(toPayoutPublic),
  };
}
