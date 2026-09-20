import { erc20Abi } from "viem";
import { PONS_LAUNCHPAD_URL, PONS_EXPLORE_URL } from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import { getPublicClient, toAddress } from "../evm/connection.js";

/**
 * The project token launches on Pons (Robinhood Chain). This script prints
 * those steps, or inspects an existing ERC-20 if you pass its address.
 *
 * Usage:
 *   npm run token:create --workspace @knock-knock/backend
 *   npm run token:create --workspace @knock-knock/backend -- 0xYourToken
 */
async function main() {
  const env = getEnv();
  const [tokenArg] = process.argv.slice(2);

  if (!tokenArg) {
    console.log("Launch the game token on Pons (Robinhood Chain launchpad):");
    console.log(`  1. Open ${PONS_LAUNCHPAD_URL}`);
    console.log("  2. Connect an EVM wallet on Robinhood Chain");
    console.log("  3. Create the coin (name, ticker, image) and launch");
    console.log("  4. Copy the token contract address");
    console.log("  5. Set TOKEN_ADDRESS in .env and restart the backend");
    console.log("");
    console.log(`Browse launches: ${PONS_EXPLORE_URL}`);
    console.log(`Network: ${env.networkName} (chain ${env.chainId})`);
    return;
  }

  const token = toAddress(tokenArg);
  if (!token) throw new Error(`Invalid token address: ${tokenArg}`);

  const client = getPublicClient();
  const [decimals, symbol, name] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "?"),
    client.readContract({ address: token, abi: erc20Abi, functionName: "name" }).catch(() => "?"),
  ]);

  console.log("Token:    ", name, `(${symbol})`);
  console.log("Address:  ", token);
  console.log("Decimals: ", decimals);
  console.log("Network:  ", env.networkName, `(chain ${env.chainId})`);
  console.log("\nSet this in your .env:");
  console.log(`TOKEN_ADDRESS=${token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
