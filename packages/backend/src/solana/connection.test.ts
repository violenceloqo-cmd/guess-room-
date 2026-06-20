import { test, expect } from "vitest";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { parseSecretKey, toPublicKey, isValidAddress } from "./connection.js";

test("parseSecretKey accepts a base58 secret key", () => {
  const kp = Keypair.generate();
  const parsed = parseSecretKey(bs58.encode(kp.secretKey));
  expect(parsed.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
});

test("parseSecretKey accepts a JSON byte array (id.json format)", () => {
  const kp = Keypair.generate();
  const parsed = parseSecretKey(JSON.stringify(Array.from(kp.secretKey)));
  expect(parsed.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
});

test("toPublicKey returns null for invalid input", () => {
  expect(toPublicKey("not-a-real-address")).toBeNull();
  expect(toPublicKey("")).toBeNull();
});

test("toPublicKey parses a valid address", () => {
  const kp = Keypair.generate();
  const pk = toPublicKey(kp.publicKey.toBase58());
  expect(pk?.toBase58()).toBe(kp.publicKey.toBase58());
});

test("isValidAddress distinguishes valid/invalid", () => {
  const kp = Keypair.generate();
  expect(isValidAddress(kp.publicKey.toBase58())).toBe(true);
  expect(isValidAddress("garbage")).toBe(false);
});
