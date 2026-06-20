import type { CSSProperties, ReactNode } from "react";

interface NeonPanelProps {
  children?: ReactNode;
  className?: string;
  /** Neon glow / border color (any CSS color). Defaults to the cyan accent. */
  glow?: string;
  style?: CSSProperties;
}

/**
 * The core surface primitive for the neon look: a translucent dark glass card
 * with a colored neon border + outer glow. Replaces the old hand-drawn RoughBox.
 * The glow color is exposed as the `--glow` CSS var so child styles can reuse it.
 */
export function NeonPanel({ children, className, glow, style }: NeonPanelProps) {
  const vars = glow ? ({ "--glow": glow } as CSSProperties) : undefined;
  return (
    <div className={`neon-panel ${className ?? ""}`} style={{ ...vars, ...style }}>
      {children}
    </div>
  );
}
