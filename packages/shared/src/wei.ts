/**
 * Money math. Everything is done in wei using BigInt to avoid any
 * floating-point rounding errors — this code controls real payouts.
 *
 * 1 ETH = 10^18 wei. Conversion from a human ETH number goes through gwei
 * (10^9) so we stay inside Number's safe integer range.
 */

export const WEI_PER_ETH = 10n ** 18n;
const GWEI_PER_ETH = 1_000_000_000;

/** Convert an ETH amount (may be fractional) to integer wei. */
export function ethToWei(eth: number): bigint {
  if (!Number.isFinite(eth) || eth < 0) {
    throw new Error(`Invalid ETH amount: ${eth}`);
  }
  // Round to the nearest gwei, then scale to wei. Supports 9 decimal places.
  return BigInt(Math.round(eth * GWEI_PER_ETH)) * 10n ** 9n;
}

/** Convert wei to an ETH number (for display only — never for math). */
export function weiToEth(wei: bigint): number {
  return Number(wei) / Number(WEI_PER_ETH);
}

/**
 * Split a pool equally among `count` winners with no wei lost.
 * Returns an array of length `count` whose entries sum exactly to `total`.
 * The remainder (total % count) is distributed one wei at a time to the
 * first entries, so the caller should pass recipients in a deterministic order.
 */
export function computeShares(total: bigint, count: number): bigint[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Invalid winner count: ${count}`);
  }
  if (total < 0n) {
    throw new Error(`Invalid total wei: ${total}`);
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
 * Pairs each (sorted) wallet with its wei share.
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
  maximumFractionDigits: 6,
});

/** Pretty ETH string for UI, e.g. "0.5 ETH". */
export function formatEth(wei: bigint): string {
  return `${formatter.format(weiToEth(wei))} ETH`;
}
