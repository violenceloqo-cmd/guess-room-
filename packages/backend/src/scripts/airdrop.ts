import { PublicKey } from "@solana/web3.js";
import { getEnv } from "../config/env.js";
import { getConnection, getHotWallet, toPublicKey } from "../solana/connection.js";
import { getBalanceLamports } from "../solana/payout.js";
import { lamportsToSol, solToLamports } from "@guess-room/shared";

/**
 * Request a devnet airdrop. Usage:
 *   npm run wallet:airdrop --workspace @guess-room/backend -- [address] [sol]
 * Defaults to the hot wallet and 2 SOL.
 */
async function main() {
  const env = getEnv();
  if (env.SOLANA_CLUSTER !== "devnet") {
    throw new Error("Airdrops are only available on devnet.");
  }
  const connection = getConnection();

  const [addressArg, solArg] = process.argv.slice(2);
  const target: PublicKey = addressArg
    ? (toPublicKey(addressArg) ?? throwBadAddress(addressArg))
    : getHotWallet().publicKey;
  const sol = solArg ? Number(solArg) : 2;

  console.log(`Requesting ${sol} SOL airdrop to ${target.toBase58()}...`);
  const sig = await connection.requestAirdrop(target, Number(solToLamports(sol)));
  const bh = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

  const balance = await getBalanceLamports(connection, target);
  console.log("Airdrop confirmed:", sig);
  console.log("New balance:      ", `${lamportsToSol(balance)} SOL`);
}

function throwBadAddress(a: string): never {
  throw new Error(`Invalid address: ${a}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
