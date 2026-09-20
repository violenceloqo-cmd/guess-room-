import { randomUUID } from "node:crypto";
import {
  ethToWei,
  explorerTxUrl,
  occupantId,
  ROOM_COUNT,
  weiToEth,
  getRoom,
} from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import { getPublicClient, getHotAccount, getWalletClient, toAddress } from "../evm/connection.js";
import { sendEth, getBalanceWei } from "../evm/payout.js";
import { MemoryStore } from "../db/memoryStore.js";
import { SupabaseStore } from "../db/supabaseStore.js";
import { getServiceClient, isSupabaseConfigured } from "../db/supabaseClient.js";
import type { Store } from "../db/store.js";
import { EvmSettlement } from "../engine/evmSettlement.js";
import type { RoundData } from "../engine/types.js";

/**
 * END-TO-END PAYOUT TEST HARNESS.
 *
 * Runs the real settlement path — the same `EvmSettlement` the engine uses —
 * against a private, synthetic round in which the target wallet is the only
 * player and its door is declared the winner.
 *
 * Usage:
 *   npm run payout:e2e --workspace @knock-knock/backend -- <wallet> [options]
 *
 * Options:
 *   --room <1-10>   Door to declare the winner. Default: the door this wallet
 *                   picked in the live round (read from the API), else 1.
 *   --pool <eth>    Pool to pay out. Default 0.002 ETH — keep test rounds cheap.
 *   --api <url>     Backend base URL for the live-pick lookup. Default
 *                   http://localhost:8787
 *   --yes           Actually send ETH. Without it, the whole path runs with the
 *                   transfer simulated (everything else is real, including the
 *                   DB writes).
 *
 * Respects DRY_RUN, MAX_PAYOUT_ETH and MAX_ROUND_PAYOUT_ETH from the env.
 */

interface Args {
  wallet: string;
  room?: number;
  poolEth: number;
  api: string;
  send: boolean;
}

function parseArgs(argv: string[]): Args {
  const [wallet] = argv;
  if (!wallet) {
    throw new Error(
      "Usage: payout:e2e <wallet> [--room 1-10] [--pool 0.002] [--api http://localhost:8787] [--yes]",
    );
  }
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const roomRaw = flag("room");
  const room = roomRaw === undefined ? undefined : Number(roomRaw);
  if (room !== undefined && (!Number.isInteger(room) || room < 1 || room > ROOM_COUNT)) {
    throw new Error(`--room must be an integer in 1..${ROOM_COUNT}`);
  }

  const poolEth = Number(flag("pool") ?? 0.002);
  if (!Number.isFinite(poolEth) || poolEth <= 0) {
    throw new Error("--pool must be a positive number of ETH");
  }

  return {
    wallet,
    room,
    poolEth,
    api: flag("api") ?? "http://localhost:8787",
    send: argv.includes("--yes"),
  };
}

async function livePick(api: string, wallet: string): Promise<number | null> {
  const id = occupantId(wallet);
  try {
    const res = await fetch(`${api}/state`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const state = (await res.json()) as {
      currentRound?: { occupants?: Record<string, string[]> } | null;
    };
    for (const [room, ids] of Object.entries(state.currentRound?.occupants ?? {})) {
      if (ids.includes(id)) return Number(room);
    }
    return null;
  } catch {
    return null;
  }
}

function buildTestRound(roundNumber: number, room: number, poolLamports: bigint): RoundData {
  const now = Date.now();
  return {
    id: randomUUID(),
    roundNumber,
    status: "settling",
    startsAtMs: now,
    endsAtMs: now,
    revealAtMs: now,
    poolLamports,
    winningRoom: room,
    guesses: new Map(),
    pendingWinner: room,
    eliminationOrder: [],
    eliminatedRooms: [],
    nextEliminationAtMs: null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = getEnv();

  if (!env.HOT_WALLET_SECRET) {
    throw new Error("HOT_WALLET_SECRET must be set for a real payout test");
  }
  const recipient = toAddress(args.wallet);
  if (!recipient) throw new Error(`Invalid wallet: ${args.wallet}`);

  const poolWei = ethToWei(args.poolEth);
  const maxPayoutWei = ethToWei(env.MAX_PAYOUT_ETH);
  const maxRoundPayoutWei = ethToWei(env.MAX_ROUND_PAYOUT_ETH);
  if (poolWei > maxPayoutWei) {
    throw new Error(
      `--pool ${args.poolEth} ETH exceeds MAX_PAYOUT_ETH (${env.MAX_PAYOUT_ETH} ETH)`,
    );
  }

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const hotWallet = getHotAccount();
  const store: Store = isSupabaseConfigured()
    ? new SupabaseStore(getServiceClient())
    : new MemoryStore();

  const picked = args.room ?? (await livePick(args.api, args.wallet));
  const room = picked ?? 1;
  const dryRun = env.DRY_RUN || !args.send;

  console.log("──────────── payout e2e test ────────────");
  console.log(`  network:     ${env.networkName} (${env.CHAIN_NETWORK})`);
  console.log(`  treasury:    ${hotWallet.address}`);
  console.log(`  recipient:   ${recipient}`);
  console.log(
    `  door:        ${room} (${getRoom(room)?.name ?? "?"})` +
      (args.room !== undefined ? " [--room]" : picked ? " [live pick]" : " [default]"),
  );
  console.log(`  pool:        ${args.poolEth} ETH`);
  console.log(`  store:       ${isSupabaseConfigured() ? "Supabase" : "in-memory"}`);
  console.log(
    `  transfer:    ${dryRun ? "SIMULATED (pass --yes to send real ETH)" : "LIVE — REAL ETH"}`,
  );
  console.log("─────────────────────────────────────────");

  const before = await getBalanceWei(publicClient, recipient);
  const treasuryBefore = await getBalanceWei(publicClient, hotWallet.address);
  console.log(`recipient balance before: ${weiToEth(before)} ETH`);
  console.log(`treasury balance before:  ${weiToEth(treasuryBefore)} ETH`);

  const roundNumber = 900_000 + Math.floor((Date.now() / 1000) % 90_000);
  const round = buildTestRound(roundNumber, room, poolWei);
  const walletKey = args.wallet.toLowerCase();
  round.guesses.set(walletKey, { wallet: walletKey, room, at: Date.now() });

  await store.insertRound(round);
  await store.upsertGuess(round.id, walletKey, room, Date.now());
  console.log(`\ninserted test round #${roundNumber} (${round.id})`);

  const settlement = new EvmSettlement({
    verifyHolding: async () => ({ holds: true, rawAmount: 0n }),
    pay: async (wallet, wei) => {
      const to = toAddress(wallet);
      if (!to) throw new Error(`Invalid payout address: ${wallet}`);
      console.log(`  sending ${weiToEth(wei)} ETH -> ${wallet}${dryRun ? " (simulated)" : ""}`);
      return sendEth(publicClient, walletClient, hotWallet, to, wei, {
        maxWei: maxPayoutWei,
        dryRun,
      });
    },
    store,
    maxPayoutLamports: maxPayoutWei,
    maxRoundPayoutLamports: maxRoundPayoutWei,
    rolloverOnNoWinner: env.ROLLOVER_ON_NO_WINNER,
    ...(dryRun
      ? {}
      : { getHotWalletBalance: () => getBalanceWei(publicClient, hotWallet.address) }),
  });

  console.log("\nsettling…");
  const outcome = await settlement.settle({
    round,
    winningRoom: room,
    candidateWallets: [walletKey],
    poolLamports: poolWei,
  });

  await store.updateRound(round.id, {
    status: "settled",
    winningRoom: room,
    rolledOver: outcome.rolledOver,
  });

  console.log("\n──────────── result ────────────");
  console.log(`  rolled over: ${outcome.rolledOver}`);
  if (outcome.payouts.length === 0) {
    console.log("  payouts:     NONE — see the log above for why");
  }
  for (const p of outcome.payouts) {
    console.log(`  payout:      ${weiToEth(p.lamports)} ETH -> ${p.wallet}`);
    console.log(`  status:      ${p.status}`);
    console.log(`  tx:          ${p.signature ?? "(none)"}`);
    if (p.signature) {
      console.log(`  explorer:    ${explorerTxUrl(p.signature, env.CHAIN_NETWORK)}`);
    }
  }

  const after = await getBalanceWei(publicClient, recipient);
  const delta = after - before;
  console.log(`\nrecipient balance after:  ${weiToEth(after)} ETH (${delta >= 0n ? "+" : ""}${weiToEth(delta)})`);
  console.log(`treasury balance after:   ${weiToEth(await getBalanceWei(publicClient, hotWallet.address))} ETH`);

  if (isSupabaseConfigured()) {
    const { data, error } = await getServiceClient()
      .from("payouts")
      .select("wallet,lamports,status,signature")
      .eq("round_id", round.id);
    if (error) {
      console.log(`\ncould not read payout rows back: ${error.message}`);
    } else {
      console.log(`\npayout rows persisted for this round: ${data?.length ?? 0}`);
      for (const r of data ?? []) {
        console.log(`  ${r.wallet} ${weiToEth(BigInt(r.lamports))} ETH ${r.status} ${r.signature ?? ""}`);
      }
    }
  }

  const paid = outcome.payouts.some((p) => p.status === "confirmed");
  if (dryRun) {
    console.log("\nSIMULATED RUN — no ETH moved. Re-run with --yes for a real transfer.");
  } else if (paid && delta > 0n) {
    console.log("\nPAYOUTS ARE WORKING — ETH left the treasury and landed on-chain.");
  } else {
    console.log("\nPAYOUT DID NOT COMPLETE — check the log above.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
