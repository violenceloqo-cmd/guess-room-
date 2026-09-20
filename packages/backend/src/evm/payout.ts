import type { Account, Address, PublicClient, WalletClient } from "viem";

export interface SendEthOptions {
  /** Hard cap: refuse to send more than this many wei in one transfer. */
  maxWei?: bigint;
  /** Number of attempts on transient failures. */
  retries?: number;
  /** When true, do not actually send — return a simulated result. */
  dryRun?: boolean;
}

export interface SendEthResult {
  /** Transaction hash, or null when dryRun. */
  signature: string | null;
  wei: bigint;
  dryRun: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send native ETH from the hot wallet to `to`, waiting for the receipt.
 * Enforces an optional hard cap as a safety net.
 */
export async function sendEth(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Account,
  to: Address,
  wei: bigint,
  opts: SendEthOptions = {},
): Promise<SendEthResult> {
  if (wei <= 0n) {
    throw new Error(`Refusing to send non-positive amount: ${wei}`);
  }
  if (opts.maxWei !== undefined && wei > opts.maxWei) {
    throw new Error(`Payout ${wei} exceeds max ${opts.maxWei} wei (safety cap)`);
  }

  if (opts.dryRun) {
    return { signature: null, wei, dryRun: true };
  }

  const retries = opts.retries ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const hash = await walletClient.sendTransaction({
        account,
        to,
        value: wei,
        chain: walletClient.chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`Transaction ${hash} reverted`);
      }
      return { signature: receipt.transactionHash, wei, dryRun: false };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw new Error(
    `sendEth failed after ${retries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/** Current native ETH balance of an account, in wei. */
export async function getBalanceWei(
  client: PublicClient,
  account: Address,
): Promise<bigint> {
  return client.getBalance({ address: account });
}
