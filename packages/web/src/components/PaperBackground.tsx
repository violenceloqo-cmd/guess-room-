/**
 * Dark neon "stage" backdrop: a deep gradient, a few colored glow blooms, and a
 * Tron-style perspective grid floor at the bottom. Fixed behind all content.
 */
export function StageBackground() {
  return (
    <div className="stage" aria-hidden>
      <div className="stage-glow" />
      <div className="stage-floor" />
      <div className="stage-vignette" />
    </div>
  );
}

/** Backwards-compatible alias so existing imports keep working. */
export const PaperBackground = StageBackground;
