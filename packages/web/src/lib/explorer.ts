import { explorerTxUrl } from "@knock-knock/shared";

/** Blockscout transaction URL for Robinhood Chain. */
export function chainTx(txHash: string, network?: string): string {
  return explorerTxUrl(txHash, network);
}
