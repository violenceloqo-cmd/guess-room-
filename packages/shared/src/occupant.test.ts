import { test, expect } from "vitest";
import { occupantId, occupantColorIndex } from "./occupant.js";

const WALLET_A = "0x1111111111111111111111111111111111111111";
const WALLET_B = "0x2222222222222222222222222222222222222222";

test("occupantId is stable for the same wallet", () => {
  expect(occupantId(WALLET_A)).toBe(occupantId(WALLET_A));
});

test("occupantId is case-insensitive for EVM checksums", () => {
  expect(occupantId(WALLET_A)).toBe(occupantId(WALLET_A.toUpperCase()));
});

test("occupantId differs for different wallets", () => {
  expect(occupantId(WALLET_A)).not.toBe(occupantId(WALLET_B));
});

test("occupantId does not contain the raw wallet", () => {
  const id = occupantId(WALLET_A);
  expect(WALLET_A.toLowerCase().includes(id)).toBe(false);
  expect(id.length).toBeLessThanOrEqual(8);
});

test("occupantColorIndex is stable and in range", () => {
  const id = occupantId("somewallet");
  expect(occupantColorIndex(id, 8)).toBe(occupantColorIndex(id, 8));
  expect(occupantColorIndex(id, 8)).toBeGreaterThanOrEqual(0);
  expect(occupantColorIndex(id, 8)).toBeLessThan(8);
});
