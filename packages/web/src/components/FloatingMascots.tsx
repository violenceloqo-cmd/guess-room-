import { motion } from "framer-motion";
import { ROOM_COLORS } from "../lib/colors";
import { Mascot, type MascotFace, type MascotPose } from "./Mascot";

interface FloatItem {
  left: string;
  top: string;
  size: number;
  delay: number;
  drift: number;
  rotate: number;
  color: string;
  pose: MascotPose;
  face: MascotFace;
  crown?: boolean;
}

// Scattered around the edges so the UI stays readable but mascots peek in.
const ITEMS: FloatItem[] = [
  { left: "4%", top: "16%", size: 92, delay: 0, drift: 16, rotate: -6, color: ROOM_COLORS[0], pose: "wave", face: "smile" },
  { left: "88%", top: "12%", size: 78, delay: 1.1, drift: 20, rotate: 7, color: ROOM_COLORS[6], pose: "idle", face: "surprised" },
  { left: "11%", top: "62%", size: 70, delay: 2.0, drift: 14, rotate: 5, color: ROOM_COLORS[4], pose: "cheer", face: "happy" },
  { left: "92%", top: "58%", size: 96, delay: 0.6, drift: 22, rotate: -8, color: ROOM_COLORS[8], pose: "think", face: "neutral" },
  { left: "78%", top: "84%", size: 64, delay: 1.6, drift: 18, rotate: 6, color: ROOM_COLORS[2], pose: "wave", face: "smile" },
  { left: "20%", top: "88%", size: 74, delay: 2.6, drift: 16, rotate: -5, color: ROOM_COLORS[9], pose: "idle", face: "happy", crown: true },
  { left: "48%", top: "8%", size: 58, delay: 1.3, drift: 24, rotate: 4, color: ROOM_COLORS[5], pose: "cheer", face: "surprised" },
  { left: "62%", top: "70%", size: 56, delay: 0.4, drift: 18, rotate: -6, color: ROOM_COLORS[7], pose: "idle", face: "smile" },
];

/** Decorative parallax-y layer of brand mascots gently bobbing behind the UI. */
export function FloatingMascots() {
  return (
    <div className="mascots" aria-hidden>
      {ITEMS.map((it, i) => (
        <motion.div
          key={i}
          className="mascot-float"
          style={{ left: it.left, top: it.top }}
          initial={{ y: 0, rotate: it.rotate }}
          animate={{ y: [0, -it.drift, 0], rotate: [it.rotate, it.rotate + 3, it.rotate] }}
          transition={{
            duration: 6 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: it.delay,
          }}
        >
          <Mascot
            size={it.size}
            color={it.color}
            pose={it.pose}
            face={it.face}
            crown={it.crown}
          />
        </motion.div>
      ))}
    </div>
  );
}
