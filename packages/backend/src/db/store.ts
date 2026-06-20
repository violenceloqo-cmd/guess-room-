import type { PayoutStatus, RoundStatus } from "@guess-room/shared";
import type { RoundData } from "../engine/types.js";

export interface RoundPatch {
  status?: RoundStatus;
  winningRoom?: number | null;
  rolledOver?: boolean;
}

export interface PayoutClaim {
  wallet: string;
  lamports: bigint;
}

export interface PayoutPatch {
  status: PayoutStatus;
  signature?: string | null;
}

/**
 * Persistence port. The backend is the only writer. Implementations:
 *  - SupabaseStore  → real Postgres (production)
 *  - MemoryStore    → in-process (local dev without Supabase, and tests)
 *
 * The payout methods provide the idempotency primitive that prevents
 * double-paying a wallet for a round across crashes/restarts.
 */
export interface Store {
  insertRound(round: RoundData): Promise<void>;
  updateRound(id: string, patch: RoundPatch): Promise<void>;
  upsertGuess(roundId: string, wallet: string, room: number, atMs: number): Promise<void>;
  setGuessVerification(
    roundId: string,
    wallet: string,
    verified: boolean,
    rawAmount: bigint,
  ): Promise<void>;

  /**
   * Insert `pending` payout rows for the round, ignoring any that already
   * exist. Returns the wallets that were NEWLY inserted — the caller must pay
   * only those, which makes settlement safe to retry.
   */
  claimPayouts(roundId: string, claims: PayoutClaim[]): Promise<string[]>;

  markPayout(roundId: string, wallet: string, patch: PayoutPatch): Promise<void>;
}
