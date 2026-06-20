import { test, expect } from "vitest";
import { occupantId, occupantColorIndex } from "./occupant.js";

test("occupantId is stable for the same wallet", () => {
  const a = occupantId("3J1UApBqEiSA5M4L2Z4gh1yaXN7CRhGcBQYLCfhSRWpA");
  const b = occupantId("3J1UApBqEiSA5M4L2Z4gh1yaXN7CRhGcBQYLCfhSRWpA");
  expect(a).toBe(b);
});

test("occupantId differs for different wallets", () => {
  const a = occupantId("3J1UApBqEiSA5M4L2Z4gh1yaXN7CRhGcBQYLCfhSRWpA");
  const b = occupantId("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
  expect(a).not.toBe(b);
});

test("occupantId does not contain the raw wallet", () => {
  const wallet = "3J1UApBqEiSA5M4L2Z4gh1yaXN7CRhGcBQYLCfhSRWpA";
  const id = occupantId(wallet);
  expect(wallet.includes(id)).toBe(false);
  expect(id.length).toBeLessThanOrEqual(8);
});

test("occupantColorIndex is stable and in range", () => {
  const id = occupantId("somewallet");
  expect(occupantColorIndex(id, 8)).toBe(occupantColorIndex(id, 8));
  expect(occupantColorIndex(id, 8)).toBeGreaterThanOrEqual(0);
  expect(occupantColorIndex(id, 8)).toBeLessThan(8);
});
