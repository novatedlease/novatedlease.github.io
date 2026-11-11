import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Real quotes print the deferral as a payment count ("payable as 34 payments"), the doc fee as a
// PPSR line or a monthly charge, and some residuals beside a "GST on residual" line (Nov 2026).
test("the lease screen explains payment counts, PPSR fees and 'GST on residual'", () => {
  const d = { ...emptyDraft(), hasQuote: true, vehicleType: "EV" as const, vehicleCondition: "New" as const };
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "lease", visited: ["intro", "car", "compare", "price", "lease"] }),
  );
  render(<App />);
  expect(screen.getByText(/count the payments: 58 on a 60-month lease means 2/)).toBeTruthy();
  expect(screen.getByText(/such as establishment, set-up or PPSR fees. Add them together/)).toBeTruthy();
  // The nuance sits in tooltips, which render when opened
  const tip = (field: string) => document.querySelector(`[data-field="${field}"] .nlc-info-trigger`)!;
  fireEvent.keyDown(tip("docFee"), { key: "Enter" });
  expect(document.body.textContent).toMatch(/leave this at \$0 and add the monthly amount to your lease management fees/);
  fireEvent.keyDown(tip("residualBasis"), { key: "Enter" });
  expect(document.body.textContent).toMatch(/“GST on residual” line/);
});
