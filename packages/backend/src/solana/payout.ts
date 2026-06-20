import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export interface SendSolOptions {
  /** Hard cap: refuse to send more than this many lamports in one transfer. */
  maxLamports?: bigint;
  /** Number of attempts on transient failures (expired blockhash, etc). */
  retries?: number;
  /** When true, do not actually send — return a simulated result. */
  dryRun?: boolean;
}

export interface SendSolResult {
  /** Transaction signature, or null when dryRun. */
  signature: string | null;
  lamports: bigint;
  dryRun: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send SOL from `from` to `to`, confirming the transaction. Retries transient
 * failures with a fresh blockhash. Enforces an optional hard cap as a safety net.
 */
export async function sendSol(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  lamports: bigint,
  opts: SendSolOptions = {},
): Promise<SendSolResult> {
  if (lamports <= 0n) {
    throw new Error(`Refusing to send non-positive amount: ${lamports}`);
  }
  if (opts.maxLamports !== undefined && lamports > opts.maxLamports) {
    throw new Error(
      `Payout ${lamports} exceeds max ${opts.maxLamports} lamports (safety cap)`,
    );
  }
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Payout ${lamports} is unreasonably large; aborting`);
  }

  if (opts.dryRun) {
    return { signature: null, lamports, dryRun: true };
  }

  const retries = opts.retries ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: from.publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to,
          lamports: Number(lamports),
        }),
      );
      const signature = await sendAndConfirmTransaction(connection, tx, [from], {
        commitment: "confirmed",
        maxRetries: 3,
      });
      return { signature, lamports, dryRun: false };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw new Error(
    `sendSol failed after ${retries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/** Current SOL balance of an account, in lamports. */
export async function getBalanceLamports(
  connection: Connection,
  account: PublicKey,
): Promise<bigint> {
  const lamports = await connection.getBalance(account, "confirmed");
  return BigInt(lamports);
}
