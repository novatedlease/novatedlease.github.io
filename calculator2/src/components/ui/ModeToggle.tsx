export type CalcMode = "guided" | "advanced";

/**
 * Guided mode is the front door; Advanced mode is the "every input on one page" view behind it.
 * So this is a single quiet link to the other mode, not a pair of equal tabs.
 */
export function ModeToggle({ mode, onChange }: { mode: CalcMode; onChange: (m: CalcMode) => void }) {
  return (
    <div className="nlc-mode-switch" data-tour-id="mode-toggle">
      {mode === "guided" ? (
        <button type="button" className="nlc-mode-switch__btn" onClick={() => onChange("advanced")}>
          Advanced mode: every input on one page →
        </button>
      ) : (
        <button type="button" className="nlc-mode-switch__btn" onClick={() => onChange("guided")}>
          ← Back to Guided mode
        </button>
      )}
    </div>
  );
}
