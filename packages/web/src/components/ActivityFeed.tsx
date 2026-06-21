import { useEffect, useState } from "react";
import { formatSol, occupantId, shortAddress } from "@room-royale/shared";
import { NeonPanel } from "./NeonPanel";
import { usePayouts } from "../hooks/usePayouts";
import { avatarColor } from "../lib/colors";
import { solscanTx } from "../lib/explorer";

interface ActivityFeedProps {
  cluster?: string;
}

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivityFeed({ cluster }: ActivityFeedProps) {
  const payouts = usePayouts();
  const [now, setNow] = useState(() => Date.now());

  // Keep the relative timestamps ticking.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <NeonPanel className="activity" glow="var(--win)">
      <div className="activity-head">
        <span className="activity-title">Payout activity</span>
        <span className="activity-sub">live · on-chain proof</span>
      </div>

      {payouts.length === 0 ? (
        <p className="activity-empty">
          No payouts yet. When a room wins, every winner shows up here with a
          Solscan transaction link.
        </p>
      ) : (
        <ul className="activity-list">
          {payouts.map((p) => {
            const color = avatarColor(occupantId(p.wallet));
            return (
              <li key={p.id} className="activity-item">
                <span className="activity-dot" style={{ background: color }} />
                <span className="activity-wallet mono">{shortAddress(p.wallet)}</span>
                <span className="activity-amount">
                  +{formatSol(BigInt(p.lamports))}
                </span>
                <span className="activity-time">{timeAgo(p.created_at, now)}</span>
                {p.signature ? (
                  <a
                    className="activity-link"
                    href={solscanTx(p.signature, cluster)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    proof ↗
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </NeonPanel>
  );
}
