# Knock Knock — Robinhood Chain Stream Game

An interactive, streamed guessing game. Players drop an EVM wallet on **Robinhood Chain** and knock on **1 of 10 doors** each round. Picking then closes and doors are knocked out one at a time until a single one is left open; everyone behind it splits that round's ETH pool, auto-paid from a hot wallet. The whole thing is rendered as a **neon corridor of glowing doorways** for streaming, with an OBS overlay.

> Rooms and doors are the same thing: the code calls them rooms (`ROOM_COUNT`, `roomColor`, `rooms` table), the UI calls them doors.

> Off-chain by design: no on-chain program. A Node backend is authoritative, Supabase (Postgres) is the store, and Supabase Realtime pushes live state to the UI and overlay.

## Monorepo layout

```
.
├── packages/
│   ├── shared/     # types, room config, constants, money (wei) math
│   ├── backend/    # game engine, EVM service, API, scheduler
│   └── web/        # player app, host panel, OBS overlay
├── supabase/
│   └── migrations/ # SQL schema, RLS, realtime publication
├── .env.example
└── tsconfig.base.json
```

## How a round works

1. **OPEN** — players connect/paste a wallet + pick a room (changeable until lock).
2. **LOCKED** — guessing closes.
3. **SETTLING** — a random winning room is chosen; winners are paid.
4. **SETTLED** — the pool is split equally and paid out in ETH; tx hashes recorded. If nobody picked the winning room, the pool rolls over.

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
| `npm run dev:backend` | Run the backend in watch mode |
| `npm run dev:web` | Run the web app |

## Safety

- Start with `DRY_RUN=true` and `CHAIN_NETWORK=testnet`. Only go to mainnet after a full rehearsal.
- The hot wallet should hold a **small ETH float only**. Per-payout and per-round caps are enforced (`MAX_PAYOUT_ETH`, `MAX_ROUND_PAYOUT_ETH`).
- All money math uses `BigInt` wei — never floats.

## Routes (web app)

| Path | Who | What |
| --- | --- | --- |
| `/` | players | Pick a room, connect wallet, watch the countdown + winner reveal |
| `/overlay` | OBS | Transparent stream overlay (rooms, countdown, pool, winners ticker) |
| `/host` | you | Secret-protected console: start/stop, set pool/round length |

## Backend API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/state` | Authoritative public game state |
| `POST` | `/guess` | `{ wallet, room }` — validates EVM address |
| `POST` | `/host/start` \| `/host/stop` | Requires `x-host-secret` header |
| `GET` \| `POST` | `/host/config` | Read / update pool, durations, rollover |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) (or `supabase db push` with the CLI).
3. If the database was created before the ETH migration, also run [`supabase/migrations/0002_wei.sql`](supabase/migrations/0002_wei.sql) to widen prize-pool columns.
4. In Project Settings → API, copy:
   - Project URL → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never the browser)
5. Restart the backend; logs will show `using SupabaseStore`.

Without Supabase the backend runs on an in-memory store and the web app falls back to polling `/state` — fully functional for local dev.

## Launching the coin (Pons)

The project token can still launch on Pons for the community — it is **not** required to play:

1. Go to [ponsfamily.com/launchpad/create](https://www.ponsfamily.com/launchpad/create).
2. Connect an EVM wallet on Robinhood Chain (chain ID `4663`), set name/ticker/image, and launch.

Anyone with a valid wallet address can join a round. Settlement pays ETH when a hot wallet is configured.

## Going live — runbook

1. **Testnet rehearsal first.** Keep `CHAIN_NETWORK=testnet` and `DRY_RUN=true`.
   - Fund the hot wallet with testnet ETH (Robinhood has no RPC airdrop; see `npm run wallet:airdrop --workspace @knock-knock/backend`).
   - Run the backend, open `/`, and play a few rounds. Watch settlement in the logs.
2. **Flip to real dry-run on mainnet.** `CHAIN_NETWORK=mainnet`, `DRY_RUN=true`. Confirm winners are detected and shares computed (no ETH sent yet).
3. **Fund the hot wallet** with only a small ETH float (a few rounds' worth). Verify with `npm run wallet:info --workspace @knock-knock/backend`.
4. **Go live.** Set `DRY_RUN=false`. The startup banner will warn `LIVE MAINNET PAYOUTS ENABLED`. Caps (`MAX_PAYOUT_ETH`, `MAX_ROUND_PAYOUT_ETH`) and the balance guard protect you.
5. **Stream.** In OBS add a Browser Source pointing at the deployed `/overlay` URL (transparent). Drive the game from `/host`.

## OBS overlay

Add a **Browser Source** → URL = `https://your-web-host/overlay` (or `http://localhost:5173/overlay` in dev), size to your canvas. The background is transparent so it composites over your scene. The winners ticker and reveal animations are designed for stream legibility.

## Build phases

This project is built heavy/risky-first and modular so bugs stay contained:
`shared` → EVM service → round engine → Supabase persistence/settlement → API + realtime → player UI → overlay/host panel → launch.
