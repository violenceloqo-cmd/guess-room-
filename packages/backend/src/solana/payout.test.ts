import { test, expect, vi } from "vitest";
import { Connection, Keypair } from "@solana/web3.js";
import { sendSol } from "./payout.js";

const from = Keypair.generate();
const to = Keypair.generate().publicKey;
// A connection whose methods would throw if touched — guards/dry-run must not reach it.
const fakeConnection = {
  getLatestBlockhash: vi.fn(() => {
    throw new Error("network should not be called");
  }),
} as unknown as Connection;

test("dry run never touches the network and returns no signature", async () => {
  const result = await sendSol(fakeConnection, from, to, 1000n, { dryRun: true });
  expect(result.dryRun).toBe(true);
  expect(result.signature).toBeNull();
  expect(result.lamports).toBe(1000n);
});

test("refuses non-positive amounts", async () => {
  await expect(sendSol(fakeConnection, from, to, 0n)).rejects.toThrow();
  await expect(sendSol(fakeConnection, from, to, -5n)).rejects.toThrow();
});

test("enforces the per-payout cap before sending", async () => {
  await expect(
    sendSol(fakeConnection, from, to, 6_000_000_000n, {
      maxLamports: 5_000_000_000n,
    }),
  ).rejects.toThrow(/safety cap/);
});

test("rejects absurdly large amounts", async () => {
  const huge = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
  await expect(sendSol(fakeConnection, from, to, huge)).rejects.toThrow();
});
