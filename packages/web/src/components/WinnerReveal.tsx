import { AnimatePresence, motion } from "framer-motion";
import {
  formatSol,
  getRoom,
  shortAddress,
  type RoundResultPublic,
} from "@guess-room/shared";
import { NeonPanel } from "./NeonPanel";
import { Character } from "./Character";
import { roomColor } from "../lib/colors";

interface WinnerRevealProps {
  result: RoundResultPublic | null;
  wallet: string;
  onClose: () => void;
}

export function WinnerReveal({ result, wallet, onClose }: WinnerRevealProps) {
  const myPayout = result?.payouts.find((p) => p.wallet === wallet.trim());
  const iWon = Boolean(myPayout);
  const room = result ? getRoom(result.winningRoom) : undefined;
  const rc = result ? roomColor(result.winningRoom) : "var(--accent)";

  return (
    <AnimatePresence>
      {result ? (
        <motion.div
          className="reveal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
            animate={{ scale: 1, rotate: -1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <NeonPanel className="reveal-card" glow={rc} style={{ ["--rc" as string]: rc }}>
              <div className="center-col">
                <Character mood={iWon ? "cheer" : "idle"} size={120} color={rc} />
              </div>
              <h2>Room {result.winningRoom} wins!</h2>
              <div className="reveal-room">{room?.name ?? ""}</div>

              {result.rolledOver ? (
                <p className="reveal-lose">
                  Nobody picked it — the {formatSol(BigInt(result.poolLamports))} pool rolls
                  over to next round! 🎲
                </p>
              ) : iWon ? (
                <p className="reveal-prize">
                  You won {formatSol(BigInt(myPayout!.lamports))}! 🎉
                  <br />
                  <span className="hint">
                    {myPayout!.status === "confirmed"
                      ? "Paid to your wallet."
                      : myPayout!.status === "skipped"
                        ? "(dry-run — no real SOL sent)"
                        : `status: ${myPayout!.status}`}
                  </span>
                </p>
              ) : (
                <p className="reveal-lose">
                  Not this time. The pool went to {result.payouts.length}{" "}
                  {result.payouts.length === 1 ? "player" : "players"}.
                </p>
              )}

              {result.payouts.length > 0 ? (
                <ul className="reveal-payouts">
                  {result.payouts.map((p) => (
                    <li key={p.wallet} className="mono">
                      {shortAddress(p.wallet)} — {formatSol(BigInt(p.lamports))}{" "}
                      {p.signature ? "✓" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </NeonPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
