import { getEnv } from "../config/env.js";
import { getConnection, getHotWallet, toPublicKey } from "../solana/connection.js";
import { sendSol, getBalanceLamports } from "../solana/payout.js";
import { lamportsToSol, solToLamports } from "@guess-room/shared";

/**
 * Send a test payout from the hot wallet. Respects DRY_RUN and MAX_PAYOUT_SOL.
 * Usage:
 *   npm run payout:test --workspace @guess-room/backend -- <to> <sol>
 */
async function main() {
  const env = getEnv();
  const connection = getConnection();
  const from = getHotWallet();

  const [toArg, solArg] = process.argv.slice(2);
  if (!toArg || !solArg) throw new Error("Usage: payout:test <to> <sol>");
  const to = toPublicKey(toArg);
  if (!to) throw new Error(`Invalid recipient: ${toArg}`);
  const lamports = solToLamports(Number(solArg));
  const maxLamports = solToLamports(env.MAX_PAYOUT_SOL);

  console.log(`From:    ${from.publicKey.toBase58()}`);
  console.log(`To:      ${to.toBase58()}`);
  console.log(`Amount:  ${solArg} SOL`);
  console.log(`Dry run: ${env.DRY_RUN}`);

  const result = await sendSol(connection, from, to, lamports, {
    maxLamports,
    dryRun: env.DRY_RUN,
  });

  if (result.dryRun) {
    console.log("DRY RUN — no SOL sent.");
  } else {
    console.log("Sent. Signature:", result.signature);
    const balance = await getBalanceLamports(connection, from.publicKey);
    console.log("Hot wallet balance now:", `${lamportsToSol(balance)} SOL`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
