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

describe("a $0 charging budget", () => {
  test("warns that it's a net loss against the 5.47c shortcut, with a link to the article", () => {
    evAtRunning("10000");
    render(<App />);
    const box = screen.getAllByLabelText(/Charging budget/).find((el) => el.tagName === "INPUT") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "0" } });
    const row = box.closest(".gd-row")!;
    expect(row.textContent).toContain("A $0 charging budget is a net loss");
    expect(row.textContent).toContain("about $547 a year at your kilometres");
    expect(row.querySelector("a")?.getAttribute("href")).toBe("/running-costs/ev-home-charging-shortcut/");
    // The filled-in 5.47c figure itself gets no warning.
    fireEvent.change(box, { target: { value: "21.04" } });
    expect(box.closest(".gd-row")!.textContent).not.toContain("net loss");
  });
});
