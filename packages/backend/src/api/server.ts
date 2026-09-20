import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ethToWei, type ApiError } from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import { isValidAddress } from "../evm/connection.js";
import type { BuiltEngine } from "../engine/factory.js";
import { createLogger } from "../util/logger.js";
import { buildGameState } from "./state.js";
import { configSchema, guessSchema } from "./schemas.js";

const log = createLogger("api");

function fail(reply: FastifyReply, status: number, code: string, error: string) {
  const body: ApiError = { ok: false, error, code };
  return reply.status(status).send(body);
}

export async function createServer(built: BuiltEngine): Promise<FastifyInstance> {
  const env = getEnv();
  const { engine } = built;

  // `trustProxy` makes Fastify read the client IP from X-Forwarded-For when
  // behind nginx / a load balancer / Cloudflare. Without it, every request
  // looks like it comes from the proxy's single IP, so all viewers share one
  // rate-limit bucket and trip 429s as soon as a few people watch the stream.
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cors, { origin: true });
  // Register the plugin but DON'T apply it globally — the frontend polls
  // GET /state every ~1.5s (~40 req/min per viewer), which would blow a global
  // budget instantly. We attach a strict limit only to the mutating /guess
  // route below; reads stay unlimited.
  await app.register(rateLimit, {
    global: false,
    allowList: [],
  });

  // ── Public ────────────────────────────────────────────────────────────────
  app.get("/health", async () => ({ ok: true }));

  app.get("/state", async () => buildGameState(engine.getSnapshot(), env));

  app.post("/guess", {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const parsed = guessSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, 400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { wallet, room } = parsed.data;

    if (!isValidAddress(wallet)) {
      return fail(reply, 400, "invalid_wallet", "That is not a valid EVM address");
    }
    const normalized = wallet.toLowerCase();

    const result = engine.addGuess(normalized, room);
    if (!result.accepted) {
      const code = result.reason ?? "rejected";
      const status = code === "no_active_round" ? 409 : 400;
      return fail(reply, status, code, humanizeRejection(code));
    }

    const round = engine.getSnapshot().currentRound;
    return reply.send({ ok: true, roundId: round?.id ?? null, room, verified: true });
  });

  // ── Host (secret-protected) ────────────────────────────────────────────────
  app.register(async (host) => {
    host.addHook("preHandler", async (request, reply) => {
      const secret = request.headers["x-host-secret"];
      if (secret !== env.HOST_API_SECRET) {
        return fail(reply, 401, "unauthorized", "Bad or missing host secret");
      }
    });

    host.post("/host/start", async () => {
      await engine.start();
      return buildGameState(engine.getSnapshot(), env);
    });

    host.post("/host/stop", async () => {
      engine.stop();
      return buildGameState(engine.getSnapshot(), env);
    });

    host.get("/host/config", async () => ({
      config: serializeConfig(engine.getConfig()),
      caps: { maxPayoutEth: env.MAX_PAYOUT_ETH, maxRoundPayoutEth: env.MAX_ROUND_PAYOUT_ETH },
      dryRun: env.DRY_RUN,
      usingSupabase: built.usingSupabase,
      usingRealPayouts: built.usingRealPayouts,
    }));

    host.post("/host/config", async (request, reply) => {
      const parsed = configSchema.safeParse(request.body);
      if (!parsed.success) {
        return fail(reply, 400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid body");
      }
      const { poolEth, durationSeconds, lockBufferSeconds, rolloverOnNoWinner } = parsed.data;
      const updated = engine.updateConfig({
        ...(poolEth !== undefined ? { poolLamports: ethToWei(poolEth) } : {}),
        ...(durationSeconds !== undefined ? { roundDurationSeconds: durationSeconds } : {}),
        ...(lockBufferSeconds !== undefined ? { lockBufferSeconds } : {}),
        ...(rolloverOnNoWinner !== undefined ? { rolloverOnNoWinner } : {}),
      });
      return reply.send({ ok: true, config: serializeConfig(updated) });
    });
  });

  return app;
}

function humanizeRejection(code: string): string {
  switch (code) {
    case "no_active_round":
      return "No round is currently open";
    case "round_locked":
      return "This round is locked — wait for the next one";
    case "invalid_room":
      return "Pick a room between 1 and 10";
    default:
      return "Guess rejected";
  }
}

function serializeConfig(config: {
  roundDurationSeconds: number;
  lockBufferSeconds: number;
  poolLamports: bigint;
  rolloverOnNoWinner: boolean;
}) {
  return {
    roundDurationSeconds: config.roundDurationSeconds,
    lockBufferSeconds: config.lockBufferSeconds,
    poolLamports: config.poolLamports.toString(),
    rolloverOnNoWinner: config.rolloverOnNoWinner,
  };
}
