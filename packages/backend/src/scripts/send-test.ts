import { ethToWei, explorerTxUrl, weiToEth } from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import { getPublicClient, getHotAccount, getWalletClient, toAddress } from "../evm/connection.js";
import { sendEth, getBalanceWei } from "../evm/payout.js";

/**
 * Send a test ETH payout from the hot wallet. Respects DRY_RUN and MAX_PAYOUT_ETH.
 * Usage:
 *   npm run payout:test --workspace @knock-knock/backend -- <to> <eth>
 */
async function main() {
  const env = getEnv();
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const from = getHotAccount();

  const [toArg, ethArg] = process.argv.slice(2);
  if (!toArg || !ethArg) throw new Error("Usage: payout:test <to> <eth>");
  const to = toAddress(toArg);
  if (!to) throw new Error(`Invalid recipient: ${toArg}`);
  const wei = ethToWei(Number(ethArg));
  const maxWei = ethToWei(env.MAX_PAYOUT_ETH);

  console.log(`From:    ${from.address}`);
  console.log(`To:      ${to}`);
  console.log(`Amount:  ${ethArg} ETH`);
  console.log(`Dry run: ${env.DRY_RUN}`);

  const result = await sendEth(publicClient, walletClient, from, to, wei, {
    maxWei,
    dryRun: env.DRY_RUN,
  });

  if (result.dryRun) {
    console.log("DRY RUN — no ETH sent.");
  } else {
    console.log("Sent. Tx:", result.signature);
    if (result.signature) {
      console.log("Explorer:", explorerTxUrl(result.signature, env.CHAIN_NETWORK));
    }
    const balance = await getBalanceWei(publicClient, from.address);
    console.log("Hot wallet balance now:", `${weiToEth(balance)} ETH`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
