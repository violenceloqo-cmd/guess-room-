import { useState } from "react";
import { getRoom, isLikelyEvmAddress } from "@knock-knock/shared";
import { connectEvmWallet, hasInjectedWallet } from "../lib/wallet";
import { NeonPanel } from "./NeonPanel";

export interface PanelMessage {
  text: string;
  kind: "error" | "info";
}

interface WalletPanelProps {
  wallet: string;
  setWallet: (w: string) => void;
  selectedRoom: number | null;
  joinedRoom: number | null;
  submitting: boolean;
  canGuess: boolean;
  message: PanelMessage | null;
  chainId?: number;
  onSubmit: () => void;
}

export function WalletPanel({
  wallet,
  setWallet,
  selectedRoom,
  joinedRoom,
  submitting,
  canGuess,
  message,
  chainId,
  onSubmit,
}: WalletPanelProps) {
  const walletOk = isLikelyEvmAddress(wallet.trim());
  const disabled = submitting || !canGuess || !walletOk || selectedRoom === null;
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const buttonLabel = submitting
    ? "Sending…"
    : joinedRoom !== null
      ? selectedRoom !== null && selectedRoom !== joinedRoom
        ? `Switch to door ${selectedRoom}`
        : "You're in!"
      : selectedRoom !== null
        ? `Lock in Door ${selectedRoom}`
        : "Pick a door first";

  const onConnect = async () => {
    setConnectError(null);
    setConnecting(true);
    try {
      const address = await connectEvmWallet(chainId ?? 4663);
      setWallet(address);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Could not connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <NeonPanel className="panel" glow="var(--accent-2)">
      <h2>Your door</h2>
      <p className="hint">
        Paste or connect your Robinhood Chain wallet — that's where winnings
        get sent. Knock on one door and lock it in before the timer ends.
        You can switch doors until they close.
      </p>
      <div className="wallet-row">
        <input
          className="sketch-input"
          placeholder="0x — Robinhood Chain wallet"
          value={wallet}
          spellCheck={false}
          onChange={(e) => setWallet(e.target.value)}
        />
        {hasInjectedWallet() ? (
          <button
            className="btn"
            type="button"
            disabled={connecting}
            onClick={() => void onConnect()}
          >
            <span className="neon-btn-inner">{connecting ? "Connecting…" : walletOk ? "Switch" : "Connect"}</span>
          </button>
        ) : null}
        <button className="btn btn-primary" disabled={disabled} onClick={onSubmit}>
          <span className="neon-btn-inner">{buttonLabel}</span>
        </button>
      </div>

      {!walletOk && wallet.trim().length > 0 ? (
        <p className="hint error">That doesn't look like a valid EVM address.</p>
      ) : null}

      {connectError ? <p className="hint error">{connectError}</p> : null}

      {joinedRoom !== null ? (
        <p className="joined">
          ✓ You're in <strong>{getRoom(joinedRoom)?.name ?? `Room ${joinedRoom}`}</strong> this round.
        </p>
      ) : null}

      {message ? (
        <p className={`hint ${message.kind === "error" ? "error" : ""}`}>{message.text}</p>
      ) : null}
    </NeonPanel>
  );
}
