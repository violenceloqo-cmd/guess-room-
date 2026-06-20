import type { PayoutStatus, RoundStatus } from "@guess-room/shared";

/** A single player's current pick for a round (latest one wins until lock). */
export interface GuessRecord {
  wallet: string;
  room: number;
  /** epoch ms when the pick was recorded. */
  at: number;
}

/** Full in-memory state of one round. The engine is authoritative over this. */
export interface RoundData {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  /** epoch ms. */
  startsAtMs: number;
  /** epoch ms — guessing deadline (picking closes / lock). */
  endsAtMs: number;
  /** epoch ms — when the last room remains and the round settles. */
  revealAtMs: number;
  poolLamports: bigint;
  winningRoom: number | null;
  /** wallet -> latest guess. Enforces one active pick per wallet per round. */
  guesses: Map<string, GuessRecord>;
  /** Predetermined last-standing room (chosen at lock; revealed gradually). */
  pendingWinner: number | null;
  /** Losing rooms in the order they will be knocked out (set at lock). */
  eliminationOrder: number[];
  /** Rooms knocked out so far (grows during the eliminating phase). */
  eliminatedRooms: number[];
  /** epoch ms of the next scheduled elimination, or null. */
  nextEliminationAtMs: number | null;
}

export interface EngineConfig {
  roundDurationSeconds: number;
  lockBufferSeconds: number;
  /** Seconds between room eliminations after picking closes. */
  eliminationIntervalSeconds: number;
  poolLamports: bigint;
  rolloverOnNoWinner: boolean;
}

/** Input handed to a settlement strategy once a winning room is chosen. */
export interface SettlementInput {
  round: RoundData;
  winningRoom: number;
  /** Wallets that picked the winning room (pre-verification). */
  candidateWallets: string[];
  /** Pool available this round (includes any rolled-over amount). */
  poolLamports: bigint;
}

export interface ComputedPayout {
  wallet: string;
  lamports: bigint;
  status: PayoutStatus;
  signature: string | null;
}

export interface SettlementOutcome {
  winningRoom: number;
  poolLamports: bigint;
  /** True when nobody (eligible) won and the pool carries to the next round. */
  rolledOver: boolean;
  payouts: ComputedPayout[];
}

/**
 * Strategy for turning a chosen winning room into payouts. Phase 2 uses a pure
 * (no-network) implementation; Phase 3 swaps in one that verifies holdings and
 * sends SOL. Keeping this behind an interface is what keeps the engine testable.
 */
export interface Settlement {
  settle(input: SettlementInput): Promise<SettlementOutcome>;
}

/**
 * Minimal persistence port the engine uses to mirror state into the DB (which
 * in turn drives Supabase Realtime for clients). Defined here so the engine
 * never imports the db layer. The full `Store` structurally satisfies it.
 */
export interface EnginePersistence {
  insertRound(round: RoundData): Promise<void>;
  updateRound(
    id: string,
    patch: {
      status?: RoundData["status"];
      winningRoom?: number | null;
      rolledOver?: boolean;
    },
  ): Promise<void>;
  upsertGuess(roundId: string, wallet: string, room: number, atMs: number): Promise<void>;
}

export interface EngineDeps {
  /** Returns current time in epoch ms. Injectable for deterministic tests. */
  now: () => number;
  /** Returns an integer winning room id in [1, roomCount]. Injectable. */
  pickRoom: () => number;
  /** Generates unique round ids. */
  newId: () => string;
  settlement: Settlement;
  /** Optional DB mirror. When omitted, the engine runs purely in memory. */
  persistence?: EnginePersistence;
}

export type GuessRejectionReason =
  | "no_active_round"
  | "round_locked"
  | "invalid_room";

export interface GuessResult {
  accepted: boolean;
  reason?: GuessRejectionReason;
}
