import { test, expect } from "vitest";
import {
  computeShares,
  splitAmongWallets,
  solToLamports,
  lamportsToSol,
  LAMPORTS_PER_SOL,
} from "./lamports.js";

test("solToLamports converts without float drift", () => {
  expect(solToLamports(0.5)).toBe(500_000_000n);
  expect(solToLamports(1)).toBe(LAMPORTS_PER_SOL);
  expect(solToLamports(0.1) + solToLamports(0.2)).toBe(300_000_000n);
});

test("lamportsToSol round-trips display value", () => {
  expect(lamportsToSol(500_000_000n)).toBe(0.5);
});

test("computeShares sums exactly to total (no lamports lost)", () => {
  const total = 1_000_000_001n; // 1_000_000_001 % 3 === 2
  const shares = computeShares(total, 3);
  expect(shares.reduce((a, b) => a + b, 0n)).toBe(total);
  // the 2 remainder lamports go to the first two winners
  expect(shares[0]).toBe(333_333_334n);
  expect(shares[1]).toBe(333_333_334n);
  expect(shares[2]).toBe(333_333_333n);
});

test("computeShares with single winner gives them everything", () => {
  expect(computeShares(777n, 1)).toEqual([777n]);
});

test("computeShares rejects zero winners", () => {
  expect(() => computeShares(100n, 0)).toThrow();
});

test("splitAmongWallets is deterministic and complete", () => {
  const total = 100n;
  const map = splitAmongWallets(total, ["zebra", "apple", "mango"]);
  const sum = [...map.values()].reduce((a, b) => a + b, 0n);
  expect(sum).toBe(total);
  // remainder lamport goes to the first wallet alphabetically ("apple")
  expect(map.get("apple")).toBe(34n);
  expect(map.get("mango")).toBe(33n);
  expect(map.get("zebra")).toBe(33n);
});

test("splitAmongWallets de-duplicates wallets", () => {
  const map = splitAmongWallets(10n, ["a", "a", "b"]);
  expect(map.size).toBe(2);
});
