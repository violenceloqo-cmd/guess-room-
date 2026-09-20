import { weiToEth } from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import { getPublicClient, getHotAccount } from "../evm/connection.js";
import { getBalanceWei } from "../evm/payout.js";

/** Prints the hot wallet address + ETH balance on Robinhood Chain. */
async function main() {
  const env = getEnv();
  const client = getPublicClient();
  const wallet = getHotAccount();
  const wei = await getBalanceWei(client, wallet.address);

  console.log("Network:     ", env.networkName, `(${env.CHAIN_NETWORK}, chain ${env.chainId})`);
  console.log("RPC:         ", env.RPC_URL);
  console.log("Explorer:    ", env.explorerUrl);
  console.log("Hot wallet:  ", wallet.address);
  console.log("Balance:     ", `${weiToEth(wei)} ETH (${wei} wei)`);
  console.log("Dry run:     ", env.DRY_RUN);
  console.log("Token:       ", env.TOKEN_ADDRESS ?? "(not set)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
