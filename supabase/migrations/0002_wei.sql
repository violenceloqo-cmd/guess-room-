-- Widen prize-pool columns so they can store wei (18 decimals, up to uint256).
-- Safe to re-run: ALTER TYPE is a no-op when already numeric(78,0).

alter table public.rounds
  alter column pool_lamports type numeric(78,0);

alter table public.payouts
  alter column lamports type numeric(78,0);

comment on column public.rounds.pool_lamports is
  'Prize pool in wei (native ETH on Robinhood Chain). Column name is historical.';
comment on column public.payouts.lamports is
  'Payout amount in wei. Column name is historical.';
