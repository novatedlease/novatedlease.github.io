import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { evElectricityClaimAnnual, nonEvFuelAnnual } from "../src/assumptions";

/**
 * Interactive coverage for App.tsx's Advanced-mode auto-fill effects — these are
 * plain `useEffect`s reacting to live user input, which the rest of the suite
 * (Node environment, renderToStaticMarkup only) can't exercise at all. This is
 * exactly the class of bug that slipped through before: the electricity claim
 * auto-fill was silently disabled by a rounding mismatch, and only a real
 * mount-and-interact test like this would have caught it.
 */
afterEach(cleanup);

function numberFromField(label: string): number {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  return Number(input.value.replace(/,/g, ""));
}

function switchToAdvanced() {
  fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
}

describe("Advanced mode auto-fill effects (real interaction, not just the underlying formula)", () => {
  test("switching Vehicle type from EV to Non-EV fills Fuel instead of leaving it at 0", () => {
    render(<App />);
    switchToAdvanced();

    // Default vehicle type is EV, so the Fuel field isn't even in the DOM yet.
    expect(screen.queryByLabelText("Fuel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Petrol / diesel / hybrid" }));

    const mileage = numberFromField("Annual mileage");
    const fuel = numberFromField("Fuel");
    expect(fuel).toBeGreaterThan(0);
    expect(fuel).toBeCloseTo(nonEvFuelAnnual(mileage), 0);
  });

  test("changing Annual mileage live-updates the Electricity claim (EV mode)", () => {
    render(<App />);
    switchToAdvanced();

    const before = numberFromField("Electricity");
    expect(before).toBeCloseTo(evElectricityClaimAnnual(numberFromField("Annual mileage")), 0);

    fireEvent.change(screen.getByLabelText("Annual mileage"), { target: { value: "20000" } });

    const after = numberFromField("Electricity");
    expect(after).toBeCloseTo(evElectricityClaimAnnual(20000), 0);
    expect(after).not.toBeCloseTo(before, 0);
  });

  test("switching back to EV zeroes Fuel out of the DOM and Electricity re-fills for the current mileage", () => {
    render(<App />);
    switchToAdvanced();
    fireEvent.click(screen.getByRole("button", { name: "Petrol / diesel / hybrid" }));
    fireEvent.change(screen.getByLabelText("Annual mileage"), { target: { value: "25000" } });

    fireEvent.click(screen.getByRole("button", { name: "EV" }));

    expect(screen.queryByLabelText("Fuel")).toBeNull();
    expect(numberFromField("Electricity")).toBeCloseTo(evElectricityClaimAnnual(25000), 0);
  });
});
