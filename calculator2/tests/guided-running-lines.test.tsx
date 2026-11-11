import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Quotes carry lines Guided has no box for (Nov 2026 review, issue 10).
test("the running-costs screen says where other quote lines go", () => {
  const d = { ...emptyDraft(), hasQuote: true, vehicleType: "EV" as const, vehicleCondition: "New" as const };
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
  );
  render(<App />);
  expect(screen.getByText("Where do other lines on my quote go?")).toBeTruthy();
  expect(screen.getByText(/add\s+them to Lease management fees/)).toBeTruthy();
  expect(screen.getByText(/add\s+them to Servicing/)).toBeTruthy();
  expect(screen.getByText(/unspent money normally comes back to you/)).toBeTruthy();
});
