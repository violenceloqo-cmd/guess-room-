import { splitAmongWallets } from "@guess-room/shared";
import { createLogger } from "../util/logger.js";
import type {
  ComputedPayout,
  Settlement,
  SettlementInput,
  SettlementOutcome,
} from "./types.js";

const log = createLogger("settlement");

/** The subset of the Store that settlement needs. */
export interface SettlementStorePort {
  setGuessVerification(
    roundId: string,
    wallet: string,
    verified: boolean,
    rawAmount: bigint,
  ): Promise<void>;
  claimPayouts(
    roundId: string,
    claims: { wallet: string; lamports: bigint }[],
  ): Promise<string[]>;
  markPayout(
    roundId: string,
    wallet: string,
    patch: { status: ComputedPayout["status"]; signature?: string | null },
  ): Promise<void>;
}

export interface PayResult {
  signature: string | null;
  dryRun: boolean;
}

export interface SolanaSettlementDeps {
  /** Re-verify a wallet's holdings at settlement time. */
  verifyHolding: (wallet: string) => Promise<{ holds: boolean; rawAmount: bigint }>;
  /** Send `lamports` to `wallet`. Honors dry-run internally. */
  pay: (wallet: string, lamports: bigint) => Promise<PayResult>;
  store: SettlementStorePort;
  maxPayoutLamports: bigint;
  maxRoundPayoutLamports: bigint;
  rolloverOnNoWinner: boolean;
  /**
   * Optional hot-wallet balance check (real payouts only). When provided and
   * the balance can't cover the pool + a small fee buffer, the round rolls over
   * instead of attempting a transfer that would fail mid-way.
   */
  getHotWalletBalance?: () => Promise<bigint>;
}

/** Per-payout fee headroom (lamports) reserved when checking the balance. */
const FEE_BUFFER_PER_PAYOUT = 10_000n;

/**
 * Production settlement: verifies the winning room's players still hold the
 * token, splits the pool among eligible winners, and pays them out idempotently.
 *
 * Safety properties:
 *  - winners are re-verified at settlement (no post-reveal gaming)
 *  - payouts are claimed in the DB first (unique per round/wallet) so a crash
 *    can never double-pay
 *  - hard per-payout and per-round caps abort unsafe transfers
 *  - any failure rolls the pool over rather than losing funds
 */
export class SolanaSettlement implements Settlement {
  constructor(private readonly deps: SolanaSettlementDeps) {}

  async settle(input: SettlementInput): Promise<SettlementOutcome> {
    const { round, winningRoom, candidateWallets, poolLamports } = input;

    const eligible = await this.filterEligible(round.id, candidateWallets);

    if (eligible.length === 0) {
      log.info(`round ${round.roundNumber}: no eligible winners`);
      return {
        winningRoom,
        poolLamports,
        rolledOver: this.deps.rolloverOnNoWinner,
        payouts: [],
      };
    }

    if (poolLamports > this.deps.maxRoundPayoutLamports) {
      log.error(
        `round ${round.roundNumber}: pool ${poolLamports} exceeds round cap ${this.deps.maxRoundPayoutLamports}; rolling over instead of paying`,
      );
      return { winningRoom, poolLamports, rolledOver: true, payouts: [] };
    }

    if (this.deps.getHotWalletBalance) {
      try {
        const balance = await this.deps.getHotWalletBalance();
        const needed = poolLamports + FEE_BUFFER_PER_PAYOUT * BigInt(eligible.length);
        if (balance < needed) {
          log.error(
            `round ${round.roundNumber}: hot wallet balance ${balance} < required ${needed}; rolling over to protect funds`,
          );
          return { winningRoom, poolLamports, rolledOver: true, payouts: [] };
        }
      } catch (err) {
        log.error(`round ${round.roundNumber}: balance check failed; rolling over`, err);
        return { winningRoom, poolLamports, rolledOver: true, payouts: [] };
      }
    }

    const shares = splitAmongWallets(poolLamports, eligible);
    const claims = [...shares.entries()].map(([wallet, lamports]) => ({
      wallet,
      lamports,
    }));

    let toPay: Set<string>;
    try {
      toPay = new Set(await this.deps.store.claimPayouts(round.id, claims));
    } catch (err) {
      log.error(`round ${round.roundNumber}: claimPayouts failed; rolling over`, err);
      return { winningRoom, poolLamports, rolledOver: true, payouts: [] };
    }

    const payouts: ComputedPayout[] = [];
    for (const { wallet, lamports } of claims) {
      payouts.push(await this.payOne(round.id, wallet, lamports, toPay.has(wallet)));
    }

    return { winningRoom, poolLamports, rolledOver: false, payouts };
  }

  private async filterEligible(roundId: string, wallets: string[]): Promise<string[]> {
    const eligible: string[] = [];
    for (const wallet of wallets) {
      try {
        const { holds, rawAmount } = await this.deps.verifyHolding(wallet);
        await this.deps.store
          .setGuessVerification(roundId, wallet, holds, rawAmount)
          .catch((e) => log.warn(`setGuessVerification failed for ${wallet}`, e));
        if (holds) eligible.push(wallet);
      } catch (err) {
        log.warn(`verification failed for ${wallet}; treating as ineligible`, err);
      }
    }
    return eligible;
  }

  private async payOne(
    roundId: string,
    wallet: string,
    lamports: bigint,
    isNewClaim: boolean,
  ): Promise<ComputedPayout> {
    if (!isNewClaim) {
      // Already claimed in a prior (crashed) settlement — never re-send.
      log.warn(`payout for ${wallet} in round ${roundId} already claimed; skipping send`);
      return { wallet, lamports, status: "skipped", signature: null };
    }

    if (lamports > this.deps.maxPayoutLamports) {
      log.error(
        `payout ${lamports} to ${wallet} exceeds per-payout cap; marking failed`,
      );
      await this.deps.store.markPayout(roundId, wallet, { status: "failed" });
      return { wallet, lamports, status: "failed", signature: null };
    }

    try {
      const res = await this.deps.pay(wallet, lamports);
      const status = res.dryRun ? "skipped" : "confirmed";
      await this.deps.store.markPayout(roundId, wallet, {
        status,
        signature: res.signature,
      });
      return { wallet, lamports, status, signature: res.signature };
    } catch (err) {
      log.error(`payout to ${wallet} failed`, err);
      await this.deps.store
        .markPayout(roundId, wallet, { status: "failed" })
        .catch(() => {});
      return { wallet, lamports, status: "failed", signature: null };
    }
  }
}
