import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoundData } from "../engine/types.js";
import { createLogger } from "../util/logger.js";
import type { PayoutClaim, PayoutPatch, RoundPatch, Store } from "./store.js";

const log = createLogger("supabase");

/** Postgres-backed Store via Supabase (service role). */
export class SupabaseStore implements Store {
  constructor(private readonly db: SupabaseClient) {}

  async insertRound(round: RoundData): Promise<void> {
    const { error } = await this.db.from("rounds").insert({
      id: round.id,
      round_number: round.roundNumber,
      status: round.status,
      pool_lamports: round.poolLamports.toString(),
      starts_at: new Date(round.startsAtMs).toISOString(),
      ends_at: new Date(round.endsAtMs).toISOString(),
      reveal_at: new Date(round.revealAtMs).toISOString(),
      winning_room: round.winningRoom,
    });
    if (error) throw new Error(`insertRound failed: ${error.message}`);
  }

  async updateRound(id: string, patch: RoundPatch): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.winningRoom !== undefined) row.winning_room = patch.winningRoom;
    if (patch.rolledOver !== undefined) row.rolled_over = patch.rolledOver;
    if (Object.keys(row).length === 0) return;
    const { error } = await this.db.from("rounds").update(row).eq("id", id);
    if (error) throw new Error(`updateRound failed: ${error.message}`);
  }

  async upsertGuess(roundId: string, wallet: string, room: number, atMs: number): Promise<void> {
    const { error } = await this.db.from("guesses").upsert(
      {
        round_id: roundId,
        wallet,
        room,
        updated_at: new Date(atMs).toISOString(),
      },
      { onConflict: "round_id,wallet" },
    );
    if (error) throw new Error(`upsertGuess failed: ${error.message}`);
  }

  async setGuessVerification(
    roundId: string,
    wallet: string,
    verified: boolean,
    rawAmount: bigint,
  ): Promise<void> {
    const { error } = await this.db
      .from("guesses")
      .update({ verified, raw_amount: rawAmount.toString() })
      .eq("round_id", roundId)
      .eq("wallet", wallet);
    if (error) throw new Error(`setGuessVerification failed: ${error.message}`);
  }

  async claimPayouts(roundId: string, claims: PayoutClaim[]): Promise<string[]> {
    if (claims.length === 0) return [];
    // Insert pending rows, ignoring duplicates. `ignoreDuplicates` means the
    // returned rows are exactly the ones we newly inserted.
    const { data, error } = await this.db
      .from("payouts")
      .upsert(
        claims.map((c) => ({
          round_id: roundId,
          wallet: c.wallet,
          lamports: c.lamports.toString(),
          status: "pending",
        })),
        { onConflict: "round_id,wallet", ignoreDuplicates: true },
      )
      .select("wallet");
    if (error) throw new Error(`claimPayouts failed: ${error.message}`);
    const claimed = (data ?? []).map((r) => r.wallet as string);
    if (claimed.length !== claims.length) {
      log.warn(
        `claimPayouts: ${claims.length - claimed.length} payout(s) already existed for round ${roundId} (idempotent skip)`,
      );
    }
    return claimed;
  }

  async markPayout(roundId: string, wallet: string, patch: PayoutPatch): Promise<void> {
    const row: Record<string, unknown> = { status: patch.status };
    if (patch.signature !== undefined) row.signature = patch.signature;
    const { error } = await this.db
      .from("payouts")
      .update(row)
      .eq("round_id", roundId)
      .eq("wallet", wallet);
    if (error) throw new Error(`markPayout failed: ${error.message}`);
  }
}
