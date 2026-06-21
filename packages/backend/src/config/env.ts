import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/** Walk up from cwd to find the repo-root .env, so scripts work from any dir. */
function findEnvFile(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envPath = findEnvFile();
if (envPath) {
  loadDotenv({ path: envPath });
}

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : v.trim().toLowerCase() === "true"));

/** Treats empty/whitespace strings as "not set" (undefined). */
const emptyToUndef = (inner: z.ZodTypeAny) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    inner,
  );

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(8787),

  SOLANA_CLUSTER: z
    .enum(["devnet", "mainnet-beta", "testnet"])
    .default("devnet"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),

  TOKEN_MINT: emptyToUndef(z.string().trim().optional()),
  TOKEN_MIN_HOLD: z.coerce.number().nonnegative().default(10_000),

  HOT_WALLET_SECRET: emptyToUndef(z.string().trim().optional()),

  ROUND_POOL_SOL: z.coerce.number().nonnegative().default(0.5),
  ROUND_DURATION_SECONDS: z.coerce.number().int().positive().default(60),
  ROUND_LOCK_BUFFER_SECONDS: z.coerce.number().int().nonnegative().default(3),
  ELIMINATION_INTERVAL_SECONDS: z.coerce.number().int().positive().default(10),
  ROLLOVER_ON_NO_WINNER: boolish.default(true),

  MAX_PAYOUT_SOL: z.coerce.number().positive().default(5),
  MAX_ROUND_PAYOUT_SOL: z.coerce.number().positive().default(10),
  DRY_RUN: boolish.default(true),

  HOST_API_SECRET: z.string().min(1).default("change-me-to-a-long-random-string"),

  SUPABASE_URL: emptyToUndef(z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: emptyToUndef(z.string().trim().optional()),
  SUPABASE_ANON_KEY: emptyToUndef(z.string().trim().optional()),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Read the raw .env file text (used only for debugging/diagnostics). */
export function envFilePath(): string | undefined {
  return envPath;
}

/** Assert that a value exists, with a helpful message naming the env var. */
export function requireEnv<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
