import { getEnv } from "./config/env.js";
import { buildEngine } from "./engine/factory.js";
import { createServer } from "./api/server.js";
import { createLogger } from "./util/logger.js";

const log = createLogger("main");

async function main() {
  const env = getEnv();
  log.info(`starting Room Royale backend (cluster=${env.SOLANA_CLUSTER}, dryRun=${env.DRY_RUN})`);

  const built = await buildEngine();

  // Loud safety summary so a misconfigured mainnet launch is obvious at a glance.
  const banner = [
    "────────────── Room Royale ──────────────",
    `  cluster:        ${env.SOLANA_CLUSTER}`,
    `  payouts:        ${env.DRY_RUN ? "DRY-RUN (no real SOL)" : "LIVE — REAL SOL WILL BE SENT"}`,
    `  store:          ${built.usingSupabase ? "Supabase" : "in-memory"}`,
    `  token mint:     ${env.TOKEN_MINT ?? "(none — pure settlement)"}`,
    `  pool/round:     ${env.ROUND_POOL_SOL} SOL`,
    `  caps:           ${env.MAX_PAYOUT_SOL} SOL/payout · ${env.MAX_ROUND_PAYOUT_SOL} SOL/round`,
    "─────────────────────────────────────────",
  ].join("\n");
  console.log(banner);
  if (!env.DRY_RUN && env.SOLANA_CLUSTER === "mainnet-beta") {
    log.warn("LIVE MAINNET PAYOUTS ENABLED — ensure the hot wallet holds only a small float");
  }

  const app = await createServer(built);

  // Start the round loop immediately so the game is live on boot.
  await built.engine.start();

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info(`API listening on http://localhost:${env.PORT}`);

  const shutdown = async (signal: string) => {
    log.info(`received ${signal}, shutting down`);
    built.engine.stop();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("fatal startup error", err);
  process.exit(1);
});
