import { getRoom, isLikelySolanaAddress, TOKEN_TICKER } from "@room-royale/shared";
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
  tokenMinHold?: number | null;
  tokenMint?: string | null;
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
  tokenMinHold,
  tokenMint,
  onSubmit,
}: WalletPanelProps) {
  const walletOk = isLikelySolanaAddress(wallet.trim());
  const disabled = submitting || !canGuess || !walletOk || selectedRoom === null;

  const buttonLabel = submitting
    ? "Sending…"
    : joinedRoom !== null
      ? selectedRoom !== null && selectedRoom !== joinedRoom
        ? `Switch to room ${selectedRoom}`
        : "You're in!"
      : selectedRoom !== null
        ? `Lock in Room ${selectedRoom}`
        : "Pick a room first";

  return (
    <NeonPanel className="panel" glow="var(--accent-2)">
      <h2>Your pick</h2>
      <p className="hint">
        Paste your Solana wallet (where winnings get sent), choose one room, and
        lock it in before the timer ends. You can change rooms until the doors close.
        {tokenMint && tokenMinHold
          ? ` You must hold at least ${tokenMinHold.toLocaleString()} ${TOKEN_TICKER} to play.`
          : ""}
      </p>
      <div className="wallet-row">
        <input
          className="sketch-input"
          placeholder="Your Solana wallet address…"
          value={wallet}
          spellCheck={false}
          onChange={(e) => setWallet(e.target.value)}
        />
        <button className="btn btn-primary" disabled={disabled} onClick={onSubmit}>
          <span className="neon-btn-inner">{buttonLabel}</span>
        </button>
      </div>

      {!walletOk && wallet.trim().length > 0 ? (
        <p className="hint error">That doesn't look like a valid Solana address.</p>
      ) : null}

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
