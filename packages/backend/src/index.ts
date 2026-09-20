import { getEnv } from "./config/env.js";
import { buildEngine } from "./engine/factory.js";
import { createServer } from "./api/server.js";
import { createLogger } from "./util/logger.js";

const log = createLogger("main");

async function main() {
  const env = getEnv();
  log.info(`starting Knock Knock backend (network=${env.CHAIN_NETWORK}, dryRun=${env.DRY_RUN})`);

  const built = await buildEngine();

  const banner = [
    "────────────── Knock Knock ──────────────",
    `  network:        ${env.networkName} (${env.CHAIN_NETWORK}, chain ${env.chainId})`,
    `  payouts:        ${env.DRY_RUN ? "DRY-RUN (no real ETH)" : "LIVE — REAL ETH WILL BE SENT"}`,
    `  store:          ${built.usingSupabase ? "Supabase" : "in-memory"}`,
    `  entry:          open — wallet address only`,
    `  pool/round:     ${env.ROUND_POOL_ETH} ETH`,
    `  caps:           ${env.MAX_PAYOUT_ETH} ETH/payout · ${env.MAX_ROUND_PAYOUT_ETH} ETH/round`,
    "─────────────────────────────────────────",
  ].join("\n");
  console.log(banner);
  if (!env.DRY_RUN && env.CHAIN_NETWORK === "mainnet") {
    log.warn("LIVE MAINNET PAYOUTS ENABLED — ensure the hot wallet holds only a small float");
  }

  const app = await createServer(built);

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
