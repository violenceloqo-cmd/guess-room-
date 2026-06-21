import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { getEnv } from "../config/env.js";
import { getConnection, getHotWallet, toPublicKey } from "../solana/connection.js";

/**
 * Creates a throwaway SPL token on devnet so the engine can be tested end-to-end
 * before the real pump.fun launch. Mints `supply` to the hot wallet (and an
 * optional extra recipient). Usage:
 *   npm run token:create --workspace @room-royale/backend -- [recipient] [supplyUi]
 *
 * Copy the printed mint into TOKEN_MINT in your .env.
 */
async function main() {
  const env = getEnv();
  if (env.SOLANA_CLUSTER !== "devnet") {
    throw new Error("create-test-token is devnet-only.");
  }
  const connection = getConnection();
  const payer = getHotWallet();

  const [recipientArg, supplyArg] = process.argv.slice(2);
  const decimals = 6;
  const supplyUi = supplyArg ? Number(supplyArg) : 1_000_000;
  const supplyRaw = BigInt(Math.round(supplyUi * 10 ** decimals));

  console.log("Creating test mint (decimals=6)...");
  const mint = await createMint(connection, payer, payer.publicKey, null, decimals);
  console.log("Mint:", mint.toBase58());

  const recipients = [payer.publicKey];
  if (recipientArg) {
    const extra = toPublicKey(recipientArg);
    if (!extra) throw new Error(`Invalid recipient: ${recipientArg}`);
    recipients.push(extra);
  }

  for (const owner of recipients) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);
    await mintTo(connection, payer, mint, ata.address, payer, supplyRaw);
    console.log(`Minted ${supplyUi} to ${owner.toBase58()} (ata ${ata.address.toBase58()})`);
  }

  console.log("\nDone. Set this in your .env:");
  console.log(`TOKEN_MINT=${mint.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
