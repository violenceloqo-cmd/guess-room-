/** Robinhood Chain (Arbitrum Orbit L2). Gas and prize payouts are native ETH. */

export type ChainNetwork = "mainnet" | "testnet";

export interface NetworkInfo {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: "ETH";
}

export const ROBINHOOD_NETWORKS: Record<ChainNetwork, NetworkInfo> = {
  mainnet: {
    id: 4663,
    name: "Robinhood Chain",
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    currency: "ETH",
  },
  testnet: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    rpcUrl: "https://rpc.testnet.chain.robinhood.com",
    explorerUrl: "https://explorer.testnet.chain.robinhood.com",
    currency: "ETH",
  },
};

/** Pons is the token launchpad on Robinhood Chain (the pump.fun equivalent). */
export const PONS_LAUNCHPAD_URL = "https://www.ponsfamily.com/launchpad/create";
export const PONS_EXPLORE_URL = "https://www.ponsfamily.com/launchpad";

export function networkById(chainId: number): NetworkInfo {
  if (chainId === ROBINHOOD_NETWORKS.testnet.id) return ROBINHOOD_NETWORKS.testnet;
  return ROBINHOOD_NETWORKS.mainnet;
}

/** Blockscout transaction URL for a Robinhood Chain tx hash. */
export function explorerTxUrl(txHash: string, network: string = "mainnet"): string {
  const info =
    network === "testnet" ? ROBINHOOD_NETWORKS.testnet : ROBINHOOD_NETWORKS.mainnet;
  return `${info.explorerUrl}/tx/${txHash}`;
}

/** Blockscout address URL. */
export function explorerAddressUrl(address: string, network: string = "mainnet"): string {
  const info =
    network === "testnet" ? ROBINHOOD_NETWORKS.testnet : ROBINHOOD_NETWORKS.mainnet;
  return `${info.explorerUrl}/address/${address}`;
}
