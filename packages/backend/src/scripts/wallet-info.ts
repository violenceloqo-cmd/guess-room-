import { getEnv } from "../config/env.js";
import { getConnection, getHotWallet } from "../solana/connection.js";
import { getBalanceLamports } from "../solana/payout.js";
import { lamportsToSol } from "@room-royale/shared";

/** Prints the hot wallet address + balance for the configured cluster. */
async function main() {
  const env = getEnv();
  const connection = getConnection();
  const wallet = getHotWallet();
  const lamports = await getBalanceLamports(connection, wallet.publicKey);

  console.log("Cluster:     ", env.SOLANA_CLUSTER);
  console.log("RPC:         ", env.SOLANA_RPC_URL);
  console.log("Hot wallet:  ", wallet.publicKey.toBase58());
  console.log("Balance:     ", `${lamportsToSol(lamports)} SOL (${lamports} lamports)`);
  console.log("Dry run:     ", env.DRY_RUN);
  console.log("Token mint:  ", env.TOKEN_MINT ?? "(not set)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
