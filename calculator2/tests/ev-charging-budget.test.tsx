import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type Money } from "../src/guided/draft";

/** EV running costs: the quote's charging line is filled in for us; the price per kWh sits apart. */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });

function evAtRunning(km: string) {
  const d = emptyDraft();
  d.hasQuote = true;
  d.provider = "smartleasing";
  d.vehicleType = "EV";
  d.vehicleCondition = "New";
  d.mileage = m(km);
  d.runningPeriod = "perFn";
  d.runningGstHeading = "exGst";
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
  );
}

describe("EV charging budget", () => {
  test("shows the 5.47c/km budget in the quote's period, matching a real Smart Leasing quote", () => {
    // 10,000 km: the quote's "Charging budget - 5.47 cents per KM" line reads 21.04 a fortnight.
    evAtRunning("10000");
    render(<App />);
    const box = screen.getAllByLabelText(/Charging budget/).find((el) => el.tagName === "INPUT") as HTMLInputElement;
    expect(box.value).toBe("21.04");
    expect(screen.getByText(/Filled in: your kilometres × the ATO's 5.47c/)).toBeTruthy();
    // Editable, like Advanced mode: a typed figure stays.
    fireEvent.change(box, { target: { value: "30" } });
    expect(box.value).toBe("30");
    const saved = JSON.parse(window.localStorage.getItem("nlc2-guided-draft-v3")!).draft;
    expect(saved.chargingBudget).toEqual({ text: "30", none: false, estimated: false });
  });

  test("the price per kWh question sits under 'Not on your quote'", () => {
    evAtRunning("10000");
    render(<App />);
    const section = screen.getByText("Not on your quote").closest(".gd-offquote")!;
    expect(section.textContent).toContain("Electricity price you pay to charge, per kWh");
  });
});
