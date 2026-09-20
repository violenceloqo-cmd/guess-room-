import { networkById } from "@knock-knock/shared";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function injected(): EthereumProvider | undefined {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

/** Prompt an injected EVM wallet (MetaMask, Robinhood Wallet, etc.) and switch to Robinhood Chain. */
export async function connectEvmWallet(chainId: number): Promise<string> {
  const ethereum = injected();
  if (!ethereum) {
    throw new Error("No EVM wallet found. Install MetaMask or Robinhood Wallet.");
  }

  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("Wallet returned no account");

  await ensureChain(ethereum, chainId);
  return address.toLowerCase();
}

async function ensureChain(ethereum: EthereumProvider, chainId: number): Promise<void> {
  const hexId = `0x${chainId.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902) return;
    const meta = networkById(chainId);
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: meta.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [meta.rpcUrl],
          blockExplorerUrls: [meta.explorerUrl],
        },
      ],
    });
  }
}

export function hasInjectedWallet(): boolean {
  return Boolean(injected());
}
