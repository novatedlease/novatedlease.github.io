/** Mirrors calculator/src/App.tsx's footer disclaimer block (~lines 1757-1785) verbatim. */
export function Footer(props: { showTourLink?: boolean; onStartTour?: () => void }) {
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 12,
        borderTop: "1px solid rgba(0,0,0,0.15)",
        fontSize: 11,
        lineHeight: 1.45,
        color: "rgba(0,0,0,0.65)",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 700 }}>CC BY-NC-SA 4.0 — © CY YEW 2026</div>
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        <li>This calculator provides factual information only, based on publicly available data as of May 2026.</li>
        <li>Consult a qualified financial adviser before making any financial decisions.</li>
        <li>Novated leasing may affect your borrowing capacity, debt obligations, government subsidies, and superannuation contributions.</li>
      </ul>
      {props.showTourLink && (
        <button type="button" className="nlc-tour-footer-link--muted" style={{ marginTop: 10 }} onClick={props.onStartTour}>
          ✨ Quick tour
        </button>
      )}
    </div>
  );
}
