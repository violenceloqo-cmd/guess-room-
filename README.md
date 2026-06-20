# Guess Room — Solana Stream Game

An interactive, streamed guessing game. Players hold a [pump.fun](https://pump.fun) token, paste their Solana address, and pick **1 of 10 rooms** each round. Every minute the backend picks a **random winning room**; everyone who chose it splits that round's SOL pool, auto-paid from a hot wallet. The whole thing is rendered in a hand-drawn **pencil / stickman** style for streaming, with an OBS overlay.

> Off-chain by design: no on-chain program. A Node backend is authoritative, Supabase (Postgres) is the store, and Supabase Realtime pushes live state to the UI and overlay.

## Monorepo layout

```
.
├── packages/
│   ├── shared/     # types, room config, constants, money (lamports) math
│   ├── backend/    # game engine, Solana service, API, scheduler  (Phase 1+)
│   └── web/        # player app, host panel, OBS overlay           (Phase 5+)
├── supabase/
│   └── migrations/ # SQL schema, RLS, realtime publication         (Phase 3)
├── scripts/        # devnet setup, test token, fund wallet, sims    (Phase 1+)
├── .env.example
└── tsconfig.base.json
```

## How a round works

1. **OPEN** — players paste a wallet + pick a room (changeable until lock).
2. **LOCKED** — guessing closes.
3. **SETTLING** — a random winning room is chosen; winners' token holdings are re-verified.
4. **SETTLED** — the pool is split equally and paid out; signatures recorded. If nobody picked the winning room, the pool rolls over.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in values
npm run build:shared   # shared package must be built before backend/web
```

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Build all workspaces |
| `npm run build:shared` | Build just the shared package |
| `npm test` | Run all workspace test suites |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run dev:backend` | Run the backend in watch mode (Phase 1+) |
| `npm run dev:web` | Run the web app (Phase 5+) |

## Safety

- Start with `DRY_RUN=true` and `SOLANA_CLUSTER=devnet`. Only go to mainnet after a full rehearsal.
- The hot wallet should hold a **small float only**. Per-payout and per-round caps are enforced (`MAX_PAYOUT_SOL`, `MAX_ROUND_PAYOUT_SOL`).
- All money math uses `BigInt` lamports — never floats.

## Routes (web app)

| Path | Who | What |
| --- | --- | --- |
| `/` | players | Pick a room, paste wallet, watch the countdown + winner reveal |
| `/overlay` | OBS | Transparent stream overlay (rooms, countdown, pool, winners ticker) |
| `/host` | you | Secret-protected console: start/stop, set pool/round length |

## Backend API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/state` | Authoritative public game state |
| `POST` | `/guess` | `{ wallet, room }` — validates address + holdings gate |
| `POST` | `/host/start` \| `/host/stop` | Requires `x-host-secret` header |
| `GET` \| `POST` | `/host/config` | Read / update pool, durations, rollover |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) (or `supabase db push` with the CLI).
3. In Project Settings → API, copy:
   - Project URL → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never the browser)
4. Restart the backend; logs will show `using SupabaseStore`.

Without Supabase the backend runs on an in-memory store and the web app falls back to polling `/state` — fully functional for local dev.

## Launching the coin (pump.fun)

The fastest path is the website:

1. Go to [pump.fun](https://pump.fun) → **Create coin**, connect your wallet, set name/ticker/image, and launch.
2. Copy the token's **mint address** (the string after `/coin/` in the URL).
3. Set `TOKEN_MINT` in `.env` and choose `TOKEN_MIN_HOLD` (minimum tokens to play).
4. Restart the backend. With a mint + hot wallet set, settlement switches to **verify holdings + pay**.

(Programmatic launch via the PumpPortal API is also possible, but the manual launch avoids handling keys for a one-time action.)

## Going live — runbook

1. **Devnet rehearsal first.** Keep `SOLANA_CLUSTER=devnet` and `DRY_RUN=true`.
   - `npm run token:create --workspace @guess-room/backend -- <yourWallet>` to mint a test token (needs a funded devnet hot wallet).
   - Set `TOKEN_MINT`, run the backend, open `/`, and play a few rounds. Watch settlement in the logs.
2. **Flip to real dry-run on mainnet.** `SOLANA_CLUSTER=mainnet-beta`, real `TOKEN_MINT`, but `DRY_RUN=true`. Confirm winners are detected and shares computed (no SOL sent yet).
3. **Fund the hot wallet** with only a small float (a few rounds' worth). Verify with `npm run wallet:info --workspace @guess-room/backend`.
4. **Go live.** Set `DRY_RUN=false`. The startup banner will warn `LIVE MAINNET PAYOUTS ENABLED`. Caps (`MAX_PAYOUT_SOL`, `MAX_ROUND_PAYOUT_SOL`) and the balance guard protect you.
5. **Stream.** In OBS add a Browser Source pointing at the deployed `/overlay` URL (transparent). Drive the game from `/host`.

## OBS overlay

Add a **Browser Source** → URL = `https://your-web-host/overlay` (or `http://localhost:5173/overlay` in dev), size to your canvas. The background is transparent so it composites over your scene. The winners ticker and reveal animations are designed for stream legibility.

## Build phases

This project is built heavy/risky-first and modular so bugs stay contained:
`shared` → Solana service → round engine → Supabase persistence/settlement → API + realtime → player UI → overlay/host panel → launch.
