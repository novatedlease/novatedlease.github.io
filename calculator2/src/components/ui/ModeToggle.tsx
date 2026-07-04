export type CalcMode = "simple" | "advanced";

export function ModeToggle({ mode, onChange }: { mode: CalcMode; onChange: (m: CalcMode) => void }) {
  return (
    <div className="nlc-mode-toggle" role="group" aria-label="Calculator mode" data-tour-id="mode-toggle">
      <button
        type="button"
        className="nlc-mode-toggle__btn"
        aria-pressed={mode === "simple"}
        onClick={() => onChange("simple")}
      >
        Simple
      </button>
      <button
        type="button"
        className="nlc-mode-toggle__btn"
        aria-pressed={mode === "advanced"}
        onClick={() => onChange("advanced")}
      >
        Advanced
      </button>
    </div>
  );
}
