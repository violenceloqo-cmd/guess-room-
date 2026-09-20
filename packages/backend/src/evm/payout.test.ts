import { test, expect, vi } from "vitest";
import type { Account, Address, PublicClient, WalletClient } from "viem";
import { sendEth } from "./payout.js";

const account = { address: "0x1111111111111111111111111111111111111111" } as Account;
const to = "0x2222222222222222222222222222222222222222" as Address;

const fakePublic = {
  waitForTransactionReceipt: vi.fn(() => {
    throw new Error("network should not be called");
  }),
} as unknown as PublicClient;

const fakeWallet = {
  sendTransaction: vi.fn(() => {
    throw new Error("network should not be called");
  }),
  chain: undefined,
} as unknown as WalletClient;

test("dry run never touches the network and returns no signature", async () => {
  const result = await sendEth(fakePublic, fakeWallet, account, to, 1000n, {
    dryRun: true,
  });
  expect(result.dryRun).toBe(true);
  expect(result.signature).toBeNull();
  expect(result.wei).toBe(1000n);
});

test("refuses non-positive amounts", async () => {
  await expect(sendEth(fakePublic, fakeWallet, account, to, 0n)).rejects.toThrow();
  await expect(sendEth(fakePublic, fakeWallet, account, to, -5n)).rejects.toThrow();
});

test("enforces the per-payout cap before sending", async () => {
  await expect(
    sendEth(fakePublic, fakeWallet, account, to, 6n * 10n ** 18n, {
      maxWei: 5n * 10n ** 18n,
    }),
  ).rejects.toThrow(/safety cap/);
});
