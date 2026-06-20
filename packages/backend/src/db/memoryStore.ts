import type { RoundData } from "../engine/types.js";
import type { PayoutClaim, PayoutPatch, RoundPatch, Store } from "./store.js";

interface MemRound {
  id: string;
  roundNumber: number;
  status: string;
  poolLamports: bigint;
  winningRoom: number | null;
  rolledOver: boolean;
}
interface MemGuess {
  wallet: string;
  room: number;
  atMs: number;
  verified: boolean | null;
  rawAmount: bigint | null;
}
interface MemPayout {
  wallet: string;
  lamports: bigint;
  status: string;
  signature: string | null;
}

/**
 * In-memory Store. Mirrors the same idempotency semantics as SupabaseStore so
 * tests and local dry-runs exercise identical logic without a live database.
 */
export class MemoryStore implements Store {
  readonly rounds = new Map<string, MemRound>();
  readonly guesses = new Map<string, Map<string, MemGuess>>();
  readonly payouts = new Map<string, Map<string, MemPayout>>();

  async insertRound(round: RoundData): Promise<void> {
    this.rounds.set(round.id, {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      poolLamports: round.poolLamports,
      winningRoom: round.winningRoom,
      rolledOver: false,
    });
    if (!this.guesses.has(round.id)) this.guesses.set(round.id, new Map());
    if (!this.payouts.has(round.id)) this.payouts.set(round.id, new Map());
  }

  async updateRound(id: string, patch: RoundPatch): Promise<void> {
    const r = this.rounds.get(id);
    if (!r) return;
    if (patch.status !== undefined) r.status = patch.status;
    if (patch.winningRoom !== undefined) r.winningRoom = patch.winningRoom;
    if (patch.rolledOver !== undefined) r.rolledOver = patch.rolledOver;
  }

  async upsertGuess(roundId: string, wallet: string, room: number, atMs: number): Promise<void> {
    const map = this.guesses.get(roundId) ?? new Map<string, MemGuess>();
    const existing = map.get(wallet);
    map.set(wallet, {
      wallet,
      room,
      atMs,
      verified: existing?.verified ?? null,
      rawAmount: existing?.rawAmount ?? null,
    });
    this.guesses.set(roundId, map);
  }

  async setGuessVerification(
    roundId: string,
    wallet: string,
    verified: boolean,
    rawAmount: bigint,
  ): Promise<void> {
    const map = this.guesses.get(roundId);
    const g = map?.get(wallet);
    if (g) {
      g.verified = verified;
      g.rawAmount = rawAmount;
    }
  }

  async claimPayouts(roundId: string, claims: PayoutClaim[]): Promise<string[]> {
    const map = this.payouts.get(roundId) ?? new Map<string, MemPayout>();
    const newlyClaimed: string[] = [];
    for (const claim of claims) {
      if (!map.has(claim.wallet)) {
        map.set(claim.wallet, {
          wallet: claim.wallet,
          lamports: claim.lamports,
          status: "pending",
          signature: null,
        });
        newlyClaimed.push(claim.wallet);
      }
    }
    this.payouts.set(roundId, map);
    return newlyClaimed;
  }

  async markPayout(roundId: string, wallet: string, patch: PayoutPatch): Promise<void> {
    const p = this.payouts.get(roundId)?.get(wallet);
    if (p) {
      p.status = patch.status;
      if (patch.signature !== undefined) p.signature = patch.signature;
    }
  }
}
