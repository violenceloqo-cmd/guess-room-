import { getEnv, requireEnv } from "../config/env.js";
import { getPublicClient, toAddress } from "../evm/connection.js";
import { TokenGate } from "../evm/verifier.js";

/**
 * Check whether a wallet meets the holding requirement. Usage:
 *   npm run holdings:check --workspace @knock-knock/backend -- <wallet>
 */
async function main() {
  const env = getEnv();
  const token = requireEnv(env.TOKEN_ADDRESS, "TOKEN_ADDRESS");
  const client = getPublicClient();

  const [walletArg] = process.argv.slice(2);
  if (!walletArg) throw new Error("Usage: holdings:check <wallet>");
  const owner = toAddress(walletArg);
  if (!owner) throw new Error(`Invalid wallet address: ${walletArg}`);

  const gate = await TokenGate.create(client, token, env.TOKEN_MIN_HOLD);
  const result = await gate.verify(owner);

  console.log("Token:       ", gate.token);
  console.log("Decimals:    ", gate.decimals);
  console.log("Min required:", gate.minUiAmount, `(${gate.minRawAmount} raw)`);
  console.log("Wallet:      ", owner);
  console.log("Holds:       ", result.uiAmount, `(${result.rawAmount} raw)`);
  console.log("Eligible:    ", result.holds ? "YES" : "NO");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
