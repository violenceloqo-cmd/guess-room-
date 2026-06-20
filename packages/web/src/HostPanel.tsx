import { useCallback, useEffect, useState } from "react";
import { formatSol, lamportsToSol } from "@guess-room/shared";
import { useGameState } from "./hooks/useGameState";
import {
  getHostInfo,
  startGame,
  stopGame,
  updateConfig,
  type HostInfo,
} from "./lib/hostApi";
import { StageBackground } from "./components/PaperBackground";
import { NeonPanel } from "./components/NeonPanel";

const SECRET_KEY = "gr_host_secret";

/** Protected host console: start/stop the game and tweak round economics live. */
export default function HostPanel() {
  const { state } = useGameState(1000);
  const [secret, setSecret] = useState(() => localStorage.getItem(SECRET_KEY) ?? "");
  const [authed, setAuthed] = useState(false);
  const [info, setInfo] = useState<HostInfo | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);

  // form fields
  const [poolSol, setPoolSol] = useState("");
  const [duration, setDuration] = useState("");
  const [lockBuffer, setLockBuffer] = useState("");
  const [rollover, setRollover] = useState(true);

  const refresh = useCallback(async (s: string) => {
    const next = await getHostInfo(s);
    setInfo(next);
    setAuthed(true);
    setPoolSol(String(lamportsToSol(BigInt(next.config.poolLamports))));
    setDuration(String(next.config.roundDurationSeconds));
    setLockBuffer(String(next.config.lockBufferSeconds));
    setRollover(next.config.rolloverOnNoWinner);
  }, []);

  useEffect(() => {
    if (secret) void refresh(secret).catch(() => setAuthed(false));
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    try {
      localStorage.setItem(SECRET_KEY, secret.trim());
      await refresh(secret.trim());
      setMsg({ text: "Connected.", kind: "ok" });
    } catch (e) {
      setAuthed(false);
      setMsg({ text: e instanceof Error ? e.message : "Failed", kind: "err" });
    } finally {
      setBusy(false);
    }
  }, [secret, refresh]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, okText: string) => {
      setBusy(true);
      setMsg(null);
      try {
        await fn();
        await refresh(secret.trim());
        setMsg({ text: okText, kind: "ok" });
      } catch (e) {
        setMsg({ text: e instanceof Error ? e.message : "Failed", kind: "err" });
      } finally {
        setBusy(false);
      }
    },
    [secret, refresh],
  );

  const saveConfig = () =>
    run(
      () =>
        updateConfig(secret.trim(), {
          poolSol: poolSol === "" ? undefined : Number(poolSol),
          durationSeconds: duration === "" ? undefined : Number(duration),
          lockBufferSeconds: lockBuffer === "" ? undefined : Number(lockBuffer),
          rolloverOnNoWinner: rollover,
        }),
      "Config saved (applies next round).",
    );

  return (
    <>
      <StageBackground />
      <div className="app">
        <h1 className="title">Host Console</h1>

        {!authed ? (
          <NeonPanel className="panel" glow="var(--accent)">
            <h2>Sign in</h2>
            <p className="hint">Enter the HOST_API_SECRET from your backend .env.</p>
            <div className="wallet-row">
              <input
                className="sketch-input"
                type="password"
                placeholder="Host secret…"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <button className="btn" disabled={busy || !secret} onClick={connect}>
                <span className="neon-btn-inner">Connect</span>
              </button>
            </div>
            {msg ? <p className={`hint ${msg.kind === "err" ? "error" : ""}`}>{msg.text}</p> : null}
          </NeonPanel>
        ) : (
          <>
            <NeonPanel className="panel" glow="var(--accent)">
              <h2>Game</h2>
              <div className="stat-row" style={{ marginBottom: 12 }}>
                <NeonPanel className="stat" glow="var(--accent)">
                  <span className="label">Running</span>
                  <span className="value">{state?.running ? "yes" : "no"}</span>
                </NeonPanel>
                <NeonPanel className="stat" glow="var(--accent)">
                  <span className="label">Round</span>
                  <span className="value">#{state?.currentRound?.roundNumber ?? "—"}</span>
                </NeonPanel>
                <NeonPanel className="stat" glow="var(--accent)">
                  <span className="label">Status</span>
                  <span className="value">{state?.currentRound?.status ?? "—"}</span>
                </NeonPanel>
                <NeonPanel className="stat" glow="var(--gold)">
                  <span className="label">Pool</span>
                  <span className="value">
                    {state?.currentRound
                      ? formatSol(BigInt(state.currentRound.poolLamports))
                      : "—"}
                  </span>
                </NeonPanel>
              </div>
              <div className="wallet-row">
                <button className="btn" style={{ ["--glow" as string]: "var(--win)" }} disabled={busy} onClick={() => run(() => startGame(secret.trim()), "Started.")}>
                  <span className="neon-btn-inner">▶ Start</span>
                </button>
                <button className="btn" style={{ ["--glow" as string]: "var(--danger)" }} disabled={busy} onClick={() => run(() => stopGame(secret.trim()), "Stopped.")}>
                  <span className="neon-btn-inner">■ Stop</span>
                </button>
              </div>
            </NeonPanel>

            <NeonPanel className="panel" glow="var(--accent-2)">
              <h2>Round settings</h2>
              <div className="host-form">
                <label>
                  Prize pool (SOL)
                  <input className="sketch-input" value={poolSol} onChange={(e) => setPoolSol(e.target.value)} />
                </label>
                <label>
                  Round seconds
                  <input className="sketch-input" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </label>
                <label>
                  Lock buffer (s)
                  <input className="sketch-input" value={lockBuffer} onChange={(e) => setLockBuffer(e.target.value)} />
                </label>
                <label className="row-check">
                  <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} />
                  Roll pool over when nobody wins
                </label>
              </div>
              <button className="btn" disabled={busy} onClick={saveConfig} style={{ marginTop: 12 }}>
                <span className="neon-btn-inner">Save settings</span>
              </button>

              {info ? (
                <p className="hint">
                  Mode: {info.dryRun ? "DRY-RUN (no real SOL)" : "LIVE PAYOUTS"} · store:{" "}
                  {info.usingSupabase ? "Supabase" : "in-memory"} · caps:{" "}
                  {info.caps.maxPayoutSol} SOL/payout, {info.caps.maxRoundPayoutSol} SOL/round
                </p>
              ) : null}
              {msg ? <p className={`hint ${msg.kind === "err" ? "error" : ""}`}>{msg.text}</p> : null}
            </NeonPanel>
          </>
        )}
      </div>
    </>
  );
}
