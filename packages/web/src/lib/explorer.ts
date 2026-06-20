/**
 * Build a Solscan transaction URL for the active cluster. Mainnet needs no
 * query param; devnet/testnet do.
 */
export function solscanTx(signature: string, cluster?: string): string {
  const base = `https://solscan.io/tx/${signature}`;
  if (cluster === "devnet") return `${base}?cluster=devnet`;
  if (cluster === "testnet") return `${base}?cluster=testnet`;
  return base;
}
