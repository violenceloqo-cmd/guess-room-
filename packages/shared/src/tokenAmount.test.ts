import { test, expect } from "vitest";
import { uiAmountToRaw, rawToUiAmount } from "./tokenAmount.js";

test("uiAmountToRaw scales by decimals", () => {
  expect(uiAmountToRaw(1, 6)).toBe(1_000_000n);
  expect(uiAmountToRaw(10_000, 6)).toBe(10_000_000_000n);
  expect(uiAmountToRaw(0.5, 9)).toBe(500_000_000n);
  expect(uiAmountToRaw(0, 6)).toBe(0n);
});

test("uiAmountToRaw rounds at the decimal boundary", () => {
  // more precision than the mint supports gets rounded to nearest raw unit
  expect(uiAmountToRaw(1.2345678, 6)).toBe(1_234_568n);
});

test("uiAmountToRaw handles large balances without Number overflow", () => {
  expect(uiAmountToRaw(1_000_000_000, 9)).toBe(1_000_000_000_000_000_000n);
});

test("rawToUiAmount inverts for display", () => {
  expect(rawToUiAmount(1_000_000n, 6)).toBe(1);
  expect(rawToUiAmount(500_000_000n, 9)).toBe(0.5);
});

test("rejects bad inputs", () => {
  expect(() => uiAmountToRaw(-1, 6)).toThrow();
  expect(() => uiAmountToRaw(1, 99)).toThrow();
});
