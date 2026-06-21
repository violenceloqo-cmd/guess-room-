import { AnimatePresence, motion } from "framer-motion";
import { TOKEN_TICKER } from "@room-royale/shared";
import { NeonPanel } from "./NeonPanel";

interface HowItWorksProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Pick a room (60s)",
    body: "Paste your Solana wallet, then choose one of the 10 rooms. You can switch rooms freely until the 1-minute timer runs out.",
  },
  {
    n: "2",
    title: "Elimination begins",
    body: "Once picking closes, one room is knocked OUT every 10 seconds. Watch the rooms drop one by one — if your room gets eliminated, you're out for the round.",
  },
  {
    n: "3",
    title: "Last room standing wins",
    body: "After the eliminations, a single room is left standing. That's the winning room.",
  },
  {
    n: "4",
    title: "Split the 0.5 SOL pot",
    body: "Everyone who picked the last-standing room splits the 0.5 SOL prize pool equally, paid straight to your wallet. If nobody picked it, the pot rolls over to the next round.",
  },
];

/** Modal explaining the round rules. */
export function HowItWorks({ open, onClose }: HowItWorksProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="reveal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <NeonPanel className="help-card" glow="var(--accent)">
              <h2>How it works</h2>
              <p className="hint">
                Room Royale is a live elimination game. Hold {TOKEN_TICKER}, pick a room, and survive.
              </p>
              <ol className="help-steps">
                {STEPS.map((s) => (
                  <li key={s.n}>
                    <span className="help-step-no">{s.n}</span>
                    <div>
                      <div className="help-step-title">{s.title}</div>
                      <div className="help-step-body">{s.body}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 6 }}>
                <span className="neon-btn-inner">Got it</span>
              </button>
            </NeonPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
