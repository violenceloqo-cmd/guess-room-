import { motion } from "framer-motion";

export type CharacterMood = "idle" | "walk" | "wave" | "cheer";

interface CharacterProps {
  mood?: CharacterMood;
  size?: number;
  className?: string;
  /** Fill / glow color (hex or CSS var). */
  color?: string;
}

/**
 * A modern flat character (rounded body + head + simple face). Replaces the old
 * pencil stickman. Whole-body motion conveys mood; arms/legs animate for walk,
 * wave, and cheer. `color` fills the body and drives a soft neon glow.
 */
export function Character({ mood = "idle", size = 40, className, color = "#3a9bff" }: CharacterProps) {
  const body =
    mood === "cheer"
      ? { y: [0, -10, 0], rotate: 0 }
      : mood === "walk"
        ? { y: [0, -2.5, 0], rotate: [-2, 2, -2] }
        : mood === "wave"
          ? { y: [0, -2, 0], rotate: 0 }
          : { y: [0, -2, 0], rotate: 0 };

  const armRight =
    mood === "cheer"
      ? { rotate: [10, 150, 10] }
      : mood === "wave"
        ? { rotate: [-10, -150, -10] }
        : mood === "walk"
          ? { rotate: [28, -28, 28] }
          : { rotate: [6, -6, 6] };
  const armLeft =
    mood === "cheer"
      ? { rotate: [-10, -150, -10] }
      : mood === "walk"
        ? { rotate: [-28, 28, -28] }
        : { rotate: [-6, 6, -6] };

  const legLeft = mood === "walk" ? { y: [0, -4, 0], x: [0, -2, 0] } : { y: 0, x: 0 };
  const legRight = mood === "walk" ? { y: [0, 0, -4], x: [0, 2, 2] } : { y: 0, x: 0 };

  const duration = mood === "walk" ? 0.5 : mood === "cheer" || mood === "wave" ? 0.9 : 2.6;
  const t = { duration, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <svg
      className={className}
      width={size}
      height={(size * 120) / 100}
      viewBox="0 0 100 120"
      fill="none"
      style={{ overflow: "visible", filter: `drop-shadow(0 0 5px ${color})` }}
    >
      {/* floor shadow */}
      <ellipse cx="50" cy="112" rx="24" ry="5" fill="rgba(0,0,0,0.45)" />

      <motion.g
        animate={body}
        transition={t}
        style={{ originX: "50px", originY: "110px" }}
      >
        {/* legs */}
        <motion.rect
          x="40" y="92" width="8" height="20" rx="4"
          fill={color}
          animate={legLeft}
          transition={t}
        />
        <motion.rect
          x="52" y="92" width="8" height="20" rx="4"
          fill={color}
          animate={legRight}
          transition={t}
        />

        {/* arms (pivot at shoulders) */}
        <motion.rect
          x="22" y="56" width="9" height="26" rx="4.5"
          fill={color}
          style={{ originX: "31px", originY: "60px" }}
          animate={armLeft}
          transition={t}
        />
        <motion.rect
          x="69" y="56" width="9" height="26" rx="4.5"
          fill={color}
          style={{ originX: "69px", originY: "60px" }}
          animate={armRight}
          transition={t}
        />

        {/* body */}
        <rect x="33" y="52" width="34" height="46" rx="16" fill={color} />
        <rect x="33" y="52" width="34" height="46" rx="16" fill="rgba(255,255,255,0.12)" />

        {/* head */}
        <circle cx="50" cy="30" r="20" fill={color} />
        <circle cx="50" cy="30" r="20" fill="rgba(255,255,255,0.1)" />
        {/* face */}
        <circle cx="43" cy="28" r="2.6" fill="#0a0a16" />
        <circle cx="57" cy="28" r="2.6" fill="#0a0a16" />
        <path d="M43 37 q7 6 14 0" stroke="#0a0a16" strokeWidth="2.4" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
