import type { GameStatePublic } from "@guess-room/shared";
import { formatSol, TOKEN_TICKER } from "@guess-room/shared";
import { NeonPanel } from "./NeonPanel";

interface HeaderProps {
  state: GameStatePublic | null;
  connected: boolean;
  onHelp?: () => void;
}

export function Header({ state, connected, onHelp }: HeaderProps) {
  const pool = state?.currentRound
    ? formatSol(BigInt(state.currentRound.poolLamports))
    : "—";
  const roundNo = state?.currentRound?.roundNumber ?? "—";

  return (
    <header className="header">
      <div className="brand">
        <img src="/logo.png" alt="Guess Room" className="brand-logo" />
        <div>
          <h1 className="title">Guess Room</h1>
          <div className="subtitle">
            <span className={`conn-dot ${connected ? "ok" : ""}`} />
            {connected ? "live" : "reconnecting…"} · {state?.cluster ?? "devnet"}
            {state?.tokenMint ? ` · hold ${state.tokenMinHold} ${TOKEN_TICKER}` : ""}
          </div>
        </div>
      </div>
      <div className="stat-row">
        {onHelp ? (
          <button className="btn help-btn" onClick={onHelp}>
            <span className="neon-btn-inner">How it works</span>
          </button>
        ) : null}
        <NeonPanel className="stat" glow="var(--accent)">
          <span className="label">Round</span>
          <span className="value">#{roundNo}</span>
        </NeonPanel>
        <NeonPanel className="stat" glow="var(--gold)">
          <span className="label">Prize Pool</span>
          <span className="value">{pool}</span>
        </NeonPanel>
      </div>
    </header>
  );
}
