import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Quotes seen Nov 2026: some headline a "novated" price with GST taken off (Flare, Oly), and
// "vehicle cost" means the drive-away price on some (SPA), so it isn't offered as a base value alias.
test("the price screen steers away from GST-removed prices and misleading aliases", () => {
  const d = { ...emptyDraft(), hasQuote: true, vehicleType: "EV" as const, vehicleCondition: "New" as const };
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "price", visited: ["intro", "car", "compare", "price"] }),
  );
  render(<App />);
  expect(screen.getByText(/full price including GST, not a lower “novated” price/)).toBeTruthy();
  expect(screen.getByText("Also called FBT value or vehicle base value. Includes GST.")).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/vehicle cost/i);
});
