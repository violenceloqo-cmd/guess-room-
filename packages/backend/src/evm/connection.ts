import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ROBINHOOD_NETWORKS, type ChainNetwork } from "@knock-knock/shared";
import { getEnv, requireEnv } from "../config/env.js";

function robinhoodChain(network: ChainNetwork, rpcUrl: string): Chain {
  const meta = ROBINHOOD_NETWORKS[network];
  return defineChain({
    id: meta.id,
    name: meta.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Blockscout", url: meta.explorerUrl },
    },
  });
}

let publicClient: PublicClient | undefined;
let chain: Chain | undefined;

function getChain(): Chain {
  if (!chain) {
    const env = getEnv();
    chain = robinhoodChain(env.CHAIN_NETWORK, env.RPC_URL);
  }
  return chain;
}

/** Shared JSON-RPC client for Robinhood Chain. */
export function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: getChain(),
      transport: http(getEnv().RPC_URL),
    });
  }
  return publicClient;
}

/**
 * Parse a hex private key from env. Accepts with or without a `0x` prefix.
 */
export function parsePrivateKey(secret: string): Hex {
  const trimmed = secret.trim();
  const hex = (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("HOT_WALLET_SECRET must be a 32-byte hex private key");
  }
  return hex;
}

let hotAccount: Account | undefined;

/** The hot wallet that funds payouts. Throws if not configured. */
export function getHotAccount(): Account {
  if (!hotAccount) {
    const env = getEnv();
    const secret = requireEnv(env.HOT_WALLET_SECRET, "HOT_WALLET_SECRET");
    hotAccount = privateKeyToAccount(parsePrivateKey(secret));
  }
  return hotAccount;
}

export function getWalletClient(): WalletClient {
  const account = getHotAccount();
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(getEnv().RPC_URL),
  });
}

/** Parse + validate an EVM address, returning the checksum form or null. */
export function toAddress(address: string): Address | null {
  try {
    if (!isAddress(address, { strict: false })) return null;
    return getAddress(address);
  } catch {
    return null;
  }
}

/** True if a string is a structurally valid EVM address. */
export function isValidAddress(address: string): boolean {
  return toAddress(address) !== null;
}
