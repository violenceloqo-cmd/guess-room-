import { getEnv, requireEnv } from "../config/env.js";
import { getConnection, toPublicKey } from "../solana/connection.js";
import { TokenGate } from "../solana/verifier.js";

/**
 * Check whether a wallet meets the holding requirement. Usage:
 *   npm run holdings:check --workspace @guess-room/backend -- <wallet>
 */
async function main() {
  const env = getEnv();
  const mint = requireEnv(env.TOKEN_MINT, "TOKEN_MINT");
  const connection = getConnection();

  const [walletArg] = process.argv.slice(2);
  if (!walletArg) throw new Error("Usage: holdings:check <wallet>");
  const owner = toPublicKey(walletArg);
  if (!owner) throw new Error(`Invalid wallet address: ${walletArg}`);

  const gate = await TokenGate.create(connection, mint, env.TOKEN_MIN_HOLD);
  const result = await gate.verify(owner);

  console.log("Mint:        ", gate.mint.toBase58());
  console.log("Decimals:    ", gate.decimals);
  console.log("Min required:", gate.minUiAmount, `(${gate.minRawAmount} raw)`);
  console.log("Wallet:      ", owner.toBase58());
  console.log("Holds:       ", result.uiAmount, `(${result.rawAmount} raw)`);
  console.log("Eligible:    ", result.holds ? "YES ✅" : "NO ❌");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
