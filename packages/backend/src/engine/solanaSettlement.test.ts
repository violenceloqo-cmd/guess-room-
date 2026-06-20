import { test, expect, vi } from "vitest";
import { MemoryStore } from "../db/memoryStore.js";
import { SolanaSettlement, type PayResult } from "./solanaSettlement.js";
import type { RoundData, SettlementInput } from "./types.js";

const POOL = 1_000_000_000n; // 1 SOL
const WINNING_ROOM = 7;

function makeRound(): RoundData {
  return {
    id: "round-1",
    roundNumber: 1,
    status: "settling",
    startsAtMs: 0,
    endsAtMs: 0,
    revealAtMs: 0,
    poolLamports: POOL,
    winningRoom: WINNING_ROOM,
    guesses: new Map(),
  };
}

function makeInput(candidateWallets: string[]): SettlementInput {
  return { round: makeRound(), winningRoom: WINNING_ROOM, candidateWallets, poolLamports: POOL };
}

function makeSettlement(opts: {
  holders: Set<string>;
  dryRun?: boolean;
  store?: MemoryStore;
  maxPayoutLamports?: bigint;
  maxRoundPayoutLamports?: bigint;
  hotWalletBalance?: bigint;
}) {
  const store = opts.store ?? new MemoryStore();
  const pay = vi.fn(async (_wallet: string, _lamports: bigint): Promise<PayResult> => ({
    signature: opts.dryRun ? null : `sig-${_wallet}`,
    dryRun: opts.dryRun ?? false,
  }));
  const settlement = new SolanaSettlement({
    verifyHolding: async (wallet) => ({
      holds: opts.holders.has(wallet),
      rawAmount: opts.holders.has(wallet) ? 999_999n : 0n,
    }),
    pay,
    store,
    maxPayoutLamports: opts.maxPayoutLamports ?? 5_000_000_000n,
    maxRoundPayoutLamports: opts.maxRoundPayoutLamports ?? 10_000_000_000n,
    rolloverOnNoWinner: true,
    ...(opts.hotWalletBalance !== undefined
      ? { getHotWalletBalance: async () => opts.hotWalletBalance! }
      : {}),
  });
  return { settlement, store, pay };
}

test("splits pool equally among eligible holders and pays them", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice", "bob", "carol"]),
  });
  const outcome = await settlement.settle(makeInput(["alice", "bob", "carol"]));

  expect(outcome.rolledOver).toBe(false);
  expect(outcome.payouts).toHaveLength(3);
  expect(outcome.payouts.every((p) => p.status === "confirmed")).toBe(true);
  const sum = outcome.payouts.reduce((a, p) => a + p.lamports, 0n);
  expect(sum).toBe(POOL);
  expect(pay).toHaveBeenCalledTimes(3);
});

test("ineligible wallets are filtered out before splitting", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice"]), // bob no longer holds
  });
  const outcome = await settlement.settle(makeInput(["alice", "bob"]));

  expect(outcome.payouts).toHaveLength(1);
  expect(outcome.payouts[0]!.wallet).toBe("alice");
  expect(outcome.payouts[0]!.lamports).toBe(POOL); // sole winner gets it all
  expect(pay).toHaveBeenCalledTimes(1);
});

test("no eligible winners rolls the pool over and pays nobody", async () => {
  const { settlement, pay } = makeSettlement({ holders: new Set() });
  const outcome = await settlement.settle(makeInput(["alice", "bob"]));

  expect(outcome.rolledOver).toBe(true);
  expect(outcome.payouts).toHaveLength(0);
  expect(pay).not.toHaveBeenCalled();
});

test("dry-run computes shares but marks payouts skipped with no signature", async () => {
  const { settlement } = makeSettlement({
    holders: new Set(["alice", "bob"]),
    dryRun: true,
  });
  const outcome = await settlement.settle(makeInput(["alice", "bob"]));

  expect(outcome.payouts.every((p) => p.status === "skipped")).toBe(true);
  expect(outcome.payouts.every((p) => p.signature === null)).toBe(true);
});

test("is idempotent: a second settlement never double-pays", async () => {
  const store = new MemoryStore();
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice", "bob"]),
    store,
  });

  await settlement.settle(makeInput(["alice", "bob"]));
  expect(pay).toHaveBeenCalledTimes(2);

  // Re-run settlement for the SAME round id (simulates a crash-replay).
  const second = await settlement.settle(makeInput(["alice", "bob"]));
  expect(pay).toHaveBeenCalledTimes(2); // not called again
  expect(second.payouts.every((p) => p.status === "skipped")).toBe(true);
});

test("per-payout cap marks the payout failed instead of sending", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice"]),
    maxPayoutLamports: 1n, // pool (1 SOL) far exceeds this
  });
  const outcome = await settlement.settle(makeInput(["alice"]));

  expect(outcome.payouts[0]!.status).toBe("failed");
  expect(pay).not.toHaveBeenCalled();
});

test("rolls over when the hot wallet can't cover the pool", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice"]),
    hotWalletBalance: POOL - 1n, // just short of the pool
  });
  const outcome = await settlement.settle(makeInput(["alice"]));

  expect(outcome.rolledOver).toBe(true);
  expect(outcome.payouts).toHaveLength(0);
  expect(pay).not.toHaveBeenCalled();
});

test("pays when the hot wallet balance is sufficient", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice"]),
    hotWalletBalance: POOL * 2n,
  });
  const outcome = await settlement.settle(makeInput(["alice"]));

  expect(outcome.rolledOver).toBe(false);
  expect(pay).toHaveBeenCalledTimes(1);
});

test("per-round cap rolls over without paying", async () => {
  const { settlement, pay } = makeSettlement({
    holders: new Set(["alice"]),
    maxRoundPayoutLamports: 1n, // pool exceeds the round cap
  });
  const outcome = await settlement.settle(makeInput(["alice"]));

  expect(outcome.rolledOver).toBe(true);
  expect(outcome.payouts).toHaveLength(0);
  expect(pay).not.toHaveBeenCalled();
});
