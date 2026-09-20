import { AnimatePresence, motion } from "framer-motion";
import { DEFAULTS } from "@knock-knock/shared";
import { NeonPanel } from "./NeonPanel";

interface HowItWorksProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Knock on a door (60s)",
    body: "Connect or paste your EVM wallet on Robinhood Chain, then choose one of the 10 doors. You can switch doors freely until the 1-minute timer runs out.",
  },
  {
    n: "2",
    title: "The knockouts begin",
    body: "Once picking closes, one door is knocked OUT every 10 seconds. Watch them slam shut one by one — if your door goes, you're out for the round.",
  },
  {
    n: "3",
    title: "Last door standing wins",
    body: "After the knockouts, a single door is still open. That's the winning door.",
  },
  {
    n: "4",
    title: `Split the ${DEFAULTS.roundPoolEth} ETH pot`,
    body: `Everyone behind the last open door splits the ${DEFAULTS.roundPoolEth} ETH prize pool equally, paid straight to your wallet. If nobody picked it, the pot rolls over to the next round.`,
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
                Knock Knock is a live elimination game. Drop your wallet address, knock on a door,
                and survive to the last one standing.
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
