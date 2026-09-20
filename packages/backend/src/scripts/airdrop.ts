import { getEnv } from "../config/env.js";
import { getHotAccount, toAddress } from "../evm/connection.js";

/**
 * Robinhood Chain has no RPC airdrop. This prints how to fund a wallet.
 * Usage:
 *   npm run wallet:airdrop --workspace @knock-knock/backend -- [address]
 */
async function main() {
  const env = getEnv();
  const [addressArg] = process.argv.slice(2);
  const target = addressArg
    ? toAddress(addressArg)
    : getHotAccount().address;
  if (!target) throw new Error(`Invalid address: ${addressArg}`);

  console.log("Robinhood Chain has no requestAirdrop RPC.");
  console.log(`Network:  ${env.networkName} (chain ${env.chainId})`);
  console.log(`Fund this wallet with ETH:`);
  console.log(`  ${target}`);
  console.log(`RPC:      ${env.RPC_URL}`);
  console.log(`Explorer: ${env.explorerUrl}/address/${target}`);
  if (env.CHAIN_NETWORK === "testnet") {
    console.log("\nBridge or request testnet ETH, then confirm the balance with:");
    console.log("  npm run wallet:info --workspace @knock-knock/backend");
  } else {
    console.log("\nBridge ETH onto Robinhood Chain mainnet, then:");
    console.log("  npm run wallet:info --workspace @knock-knock/backend");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
