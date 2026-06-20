import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { getEnv, requireEnv } from "../config/env.js";

let connection: Connection | undefined;

/** Shared RPC connection (confirmed commitment is a good default for payouts). */
export function getConnection(): Connection {
  if (!connection) {
    const env = getEnv();
    connection = new Connection(env.SOLANA_RPC_URL, {
      commitment: "confirmed",
    });
  }
  return connection;
}

/**
 * Parse a secret key from env. Accepts either:
 *   - a JSON array of bytes (Solana CLI / `id.json` format), or
 *   - a base58-encoded secret key string (Phantom export format).
 */
export function parseSecretKey(secret: string): Keypair {
  const trimmed = secret.trim();
  if (trimmed.startsWith("[")) {
    const bytes = JSON.parse(trimmed) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

let hotWallet: Keypair | undefined;

/** The hot wallet that funds payouts. Throws if not configured. */
export function getHotWallet(): Keypair {
  if (!hotWallet) {
    const env = getEnv();
    const secret = requireEnv(env.HOT_WALLET_SECRET, "HOT_WALLET_SECRET");
    hotWallet = parseSecretKey(secret);
  }
  return hotWallet;
}

/** Parse + validate a base58 address into a PublicKey, returning null if invalid. */
export function toPublicKey(address: string): PublicKey | null {
  try {
    return new PublicKey(address);
  } catch {
    return null;
  }
}

/** True if a string is a structurally valid Solana public key. */
export function isValidAddress(address: string): boolean {
  return toPublicKey(address) !== null;
}
