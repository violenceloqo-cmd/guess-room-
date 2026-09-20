import { test, expect } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parsePrivateKey, toAddress, isValidAddress } from "./connection.js";

test("parsePrivateKey accepts a 0x-prefixed hex key", () => {
  const key = generatePrivateKey();
  expect(parsePrivateKey(key)).toBe(key);
  const account = privateKeyToAccount(parsePrivateKey(key));
  expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
});

test("parsePrivateKey accepts a bare 64-char hex key", () => {
  const key = generatePrivateKey();
  const bare = key.slice(2);
  expect(parsePrivateKey(bare)).toBe(key);
});

test("parsePrivateKey rejects garbage", () => {
  expect(() => parsePrivateKey("not-a-key")).toThrow();
  expect(() => parsePrivateKey("0x1234")).toThrow();
});

test("toAddress returns null for invalid input", () => {
  expect(toAddress("not-a-real-address")).toBeNull();
  expect(toAddress("")).toBeNull();
  expect(toAddress("3J1UApBqEiSA5M4L2Z4gh1yaXN7CRhGcBQYLCfhSRWpA")).toBeNull();
});

test("toAddress checksums a valid address", () => {
  const lower = "0x1111111111111111111111111111111111111111";
  expect(toAddress(lower)?.toLowerCase()).toBe(lower);
});

test("isValidAddress distinguishes valid/invalid", () => {
  expect(isValidAddress("0x1111111111111111111111111111111111111111")).toBe(true);
  expect(isValidAddress("garbage")).toBe(false);
});
