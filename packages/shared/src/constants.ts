/** Cross-cutting defaults. Authoritative runtime values come from backend env. */

/** Display ticker for the project token. */
export const TOKEN_TICKER = "$DOOR";

export const DEFAULTS = {
  roundDurationSeconds: 60,
  roundLockBufferSeconds: 3,
  /** Seconds between room eliminations after picking closes. */
  eliminationIntervalSeconds: 10,
  roundPoolSol: 0.5,
  tokenMinHold: 10_000,
  rolloverOnNoWinner: true,
} as const;

/** A Solana base58 address is 32–44 chars of the base58 alphabet. */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Cheap, dependency-free sanity check for a Solana address. The backend does
 * the authoritative validation via PublicKey; this is for fast client-side UX.
 */
export function isLikelySolanaAddress(value: unknown): value is string {
  return typeof value === "string" && BASE58_RE.test(value);
}

/** Short, masked address for display: `AbCd…WxYz`. */
export function shortAddress(address: string): string {
  if (address.length <= 9) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
