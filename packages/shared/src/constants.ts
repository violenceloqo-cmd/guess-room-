/** Cross-cutting defaults. Authoritative runtime values come from backend env. */

/** Display ticker for the project token (launched on Pons / Robinhood Chain). */
export const TOKEN_TICKER = "$DOOR";

export const DEFAULTS = {
  roundDurationSeconds: 60,
  roundLockBufferSeconds: 3,
  /** Seconds between room eliminations after picking closes. */
  eliminationIntervalSeconds: 10,
  roundPoolEth: 0.01,
  tokenMinHold: 10_000,
  rolloverOnNoWinner: true,
} as const;

/** EIP-55-tolerant EVM address: 0x + 40 hex chars. */
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Cheap, dependency-free sanity check for an EVM address. The backend does
 * the authoritative validation via viem; this is for fast client-side UX.
 */
export function isLikelyEvmAddress(value: unknown): value is string {
  return typeof value === "string" && EVM_ADDRESS_RE.test(value.trim());
}

/** Short, masked address for display: `0xAbCd…WxYz`. */
export function shortAddress(address: string): string {
  const value = address.trim();
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
