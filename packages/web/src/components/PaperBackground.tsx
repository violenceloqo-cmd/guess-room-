/**
 * Arena backdrop: deep purple stage, gold spotlight, subtle cross-hatch texture,
 * and a soft elliptical "ring" at the bottom suggesting a battle floor.
 */
export function StageBackground() {
  return (
    <div className="stage" aria-hidden>
      <div className="stage-texture" />
      <div className="stage-spotlight" />
      <div className="stage-ring" />
      <div className="stage-vignette" />
    </div>
  );
}

/** Backwards-compatible alias so existing imports keep working. */
export const PaperBackground = StageBackground;
