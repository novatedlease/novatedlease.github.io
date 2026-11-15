import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";
import { PROVIDERS } from "../src/guided/providerGuide";
import { DEFAULT_RUN_ORDER, RUNNING_LAYOUT, runningOrder } from "../src/guided/runningLayout";

/** Running costs follow each provider's quote: its order and its wording (15 Nov 2026). */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });

function atRunning(provider: GuidedDraft["provider"], vehicleType: "EV" | "Non-EV") {
  const d = emptyDraft();
  d.hasQuote = true;
  d.provider = provider;
  d.vehicleType = vehicleType;
  d.vehicleCondition = "New";
  d.mileage = m("15000");
  d.runningPeriod = "perFn";
  d.runningGstHeading = "exGst";
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
  );
  render(<App />);
  return [...document.querySelectorAll(".gd-rows .gd-row .nlc-field__label")].map((el) => el.textContent!.replace(/(ex|inc) GSTi?$/, "").trim());
}

describe("running layout data", () => {
  test("every layout names a real provider and uses each box at most once", () => {
    const ids = new Set(PROVIDERS.map((p) => p.id));
    for (const [id, rows] of Object.entries(RUNNING_LAYOUT)) {
      expect(ids.has(id as never)).toBe(true);
      const boxes = rows!.map(([box]) => box);
      expect(new Set(boxes).size).toBe(boxes.length);
      for (const box of boxes) expect(DEFAULT_RUN_ORDER).toContain(box);
    }
  });

  test("every box is shown once, whatever the provider", () => {
    for (const p of [null, ...PROVIDERS.map((x) => x.id)])
      expect(runningOrder(p).map((r) => r.box).sort()).toEqual([...DEFAULT_RUN_ORDER].sort());
  });
});

describe("running-costs screen", () => {
  test("SG Fleet: the fee comes first, in SG Fleet's words", () => {
    expect(atRunning("sgfleet", "Non-EV")).toEqual([
      "Package management fee", "Fuel/charging", "Tyres", "Service and maintenance", "Registration", "Insurance",
    ]);
  });

  test("Smart Leasing EV: the charging line keeps the quote's wording", () => {
    const labels = atRunning("smartleasing", "EV");
    expect(labels[0]).toBe("Maintenance");
    expect(labels).toContain("Charging budget - 5.47 cents per KM");
  });

  test("boxes a quote doesn't have go last, with Guided's own names", () => {
    // Remunerator's quotes have no tyres or fee line.
    expect(atRunning("remunerator", "Non-EV")).toEqual([
      "Recharging", "Maintenance", "Registration", "Insurance", "Tyres", "Lease management fees",
    ]);
  });

  test("no provider: Guided's own order and names", () => {
    expect(atRunning(null, "Non-EV")).toEqual([
      "Servicing and maintenance", "Tyres", "Registration and CTP", "Insurance", "Lease management fees", "Fuel",
    ]);
  });
});

describe("other lines help placement", () => {
  test("comes after the quote's boxes and before the price-per-kWh question", () => {
    atRunning("smartleasing", "EV");
    const text = document.body.textContent!;
    const help = text.indexOf("Where do other lines on my quote go?");
    expect(help).toBeGreaterThan(text.indexOf("Administration fee"));
    expect(help).toBeLessThan(text.indexOf("Electricity price you pay to charge"));
  });
});

describe("running costs byline", () => {
  test("names the provider whose order and wording the boxes follow", () => {
    atRunning("smartleasing", "EV");
    expect(document.body.textContent).toContain("From your quote's running-cost budget, in Smart Leasing's order and wording.");
  });

  test("stays generic without a provider layout", () => {
    atRunning("millarx", "EV");
    expect(document.body.textContent).toContain("From your quote's running-cost budget.");
  });
});
