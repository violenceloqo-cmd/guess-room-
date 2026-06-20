import { splitAmongWallets } from "@guess-room/shared";
import type {
  Settlement,
  SettlementInput,
  SettlementOutcome,
} from "./types.js";

/**
 * Pure settlement: splits the pool equally among everyone who picked the
 * winning room, with NO holdings verification and NO real payout. Used for
 * unit tests and dry-run simulation. Phase 3 provides the Solana-backed version.
 */
export class PureSettlement implements Settlement {
  constructor(private readonly rolloverOnNoWinner: boolean) {}

  async settle(input: SettlementInput): Promise<SettlementOutcome> {
    const { winningRoom, candidateWallets, poolLamports } = input;

    if (candidateWallets.length === 0) {
      return {
        winningRoom,
        poolLamports,
        rolledOver: this.rolloverOnNoWinner,
        payouts: [],
      };
    }

    const shares = splitAmongWallets(poolLamports, candidateWallets);
    const payouts = [...shares.entries()].map(([wallet, lamports]) => ({
      wallet,
      lamports,
      status: "skipped" as const, // computed but not sent in pure mode
      signature: null,
    }));

    return {
      winningRoom,
      poolLamports,
      rolledOver: false,
      payouts,
    };
  }
}
