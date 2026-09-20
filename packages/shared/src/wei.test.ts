import { test, expect } from "vitest";
import {
  computeShares,
  splitAmongWallets,
  ethToWei,
  weiToEth,
  WEI_PER_ETH,
  formatEth,
} from "./wei.js";

test("ethToWei converts without float drift", () => {
  expect(ethToWei(0.5)).toBe(500_000_000_000_000_000n);
  expect(ethToWei(1)).toBe(WEI_PER_ETH);
  expect(ethToWei(0.1) + ethToWei(0.2)).toBe(300_000_000_000_000_000n);
});

test("weiToEth round-trips display value", () => {
  expect(weiToEth(500_000_000_000_000_000n)).toBe(0.5);
});

test("formatEth pretty-prints", () => {
  expect(formatEth(ethToWei(0.5))).toBe("0.5 ETH");
});

test("computeShares sums exactly to total (no wei lost)", () => {
  const total = 1_000_000_001n;
  const shares = computeShares(total, 3);
  expect(shares.reduce((a, b) => a + b, 0n)).toBe(total);
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
  expect(map.get("apple")).toBe(34n);
  expect(map.get("mango")).toBe(33n);
  expect(map.get("zebra")).toBe(33n);
});

test("splitAmongWallets de-duplicates wallets", () => {
  const map = splitAmongWallets(10n, ["a", "a", "b"]);
  expect(map.size).toBe(2);
});
