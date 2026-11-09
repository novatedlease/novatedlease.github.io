/**
 * Under the calculator: only the "Quick tour" link, shown once the reader has hidden the
 * tour button. The licence line and disclaimers live at the bottom of the calculator page
 * (new-site/src/pages/calculator/index.astro, .calc2-legal), not mid-page.
 */
export function Footer(props: { showTourLink?: boolean; onStartTour?: () => void }) {
  if (!props.showTourLink) return null;
  return (
    <div style={{ marginTop: 16, width: "100%" }}>
      <button type="button" className="nlc-tour-footer-link--muted" onClick={props.onStartTour}>
        Quick tour
      </button>
    </div>
  );
}
