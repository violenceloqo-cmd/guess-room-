import type { GameStatePublic } from "@knock-knock/shared";
import { formatEth } from "@knock-knock/shared";
import { BrandLogo } from "./BrandLogo";
import { NeonPanel } from "./NeonPanel";

interface HeaderProps {
  state: GameStatePublic | null;
  connected: boolean;
  onHelp?: () => void;
}

export function Header({ state, connected, onHelp }: HeaderProps) {
  const pool = state?.currentRound
    ? formatEth(BigInt(state.currentRound.poolLamports))
    : "—";
  const roundNo = state?.currentRound?.roundNumber ?? "—";

  return (
    <header className="header">
      <div className="brand">
        <BrandLogo className="compact" mascotSize={88} />
        <div className="brand-tagline">Ten doors · one stays open</div>
        <div className="subtitle brand-status">
          <span className={`conn-dot ${connected ? "ok" : ""}`} />
          {connected ? "live" : "reconnecting…"} · robinhood · {state?.cluster ?? "testnet"}
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
