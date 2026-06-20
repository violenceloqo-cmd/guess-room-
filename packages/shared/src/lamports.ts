/**
 * Money math. Everything is done in lamports using BigInt to avoid any
 * floating-point rounding errors — this code controls real payouts.
 */

export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Convert a SOL amount (may be fractional) to integer lamports. */
export function solToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error(`Invalid SOL amount: ${sol}`);
  }
  // Round to the nearest lamport to avoid 0.1 + 0.2 style drift.
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
}

/** Convert lamports to a SOL number (for display only — never for math). */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
}

/**
 * Split a pool equally among `count` winners with no lamports lost.
 * Returns an array of length `count` whose entries sum exactly to `total`.
 * The remainder (total % count) is distributed one lamport at a time to the
 * first entries, so the caller should pass recipients in a deterministic order.
 */
export function computeShares(total: bigint, count: number): bigint[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Invalid winner count: ${count}`);
  }
  if (total < 0n) {
    throw new Error(`Invalid total lamports: ${total}`);
  }
  const n = BigInt(count);
  const base = total / n;
  const remainder = Number(total % n);
  const shares: bigint[] = [];
  for (let i = 0; i < count; i++) {
    shares.push(i < remainder ? base + 1n : base);
  }
  return shares;
}

/**
 * Deterministic order for distributing the remainder: sort wallet strings.
 * Pairs each (sorted) wallet with its lamport share.
 */
export function splitAmongWallets(
  total: bigint,
  wallets: readonly string[],
): Map<string, bigint> {
  const unique = Array.from(new Set(wallets)).sort();
  const shares = computeShares(total, unique.length);
  const result = new Map<string, bigint>();
  unique.forEach((wallet, i) => {
    result.set(wallet, shares[i]!);
  });
  return result;
}

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

/** Pretty SOL string for UI, e.g. "0.5 SOL". */
export function formatSol(lamports: bigint): string {
  return `${formatter.format(lamportsToSol(lamports))} SOL`;
}
