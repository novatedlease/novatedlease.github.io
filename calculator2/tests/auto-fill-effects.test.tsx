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

function numberFromField(label: string | RegExp): number {
  // Some field labels wrap extra interactive elements (e.g. the Residual value
  // field's ex-GST/inc-GST toggle buttons), so getByLabelText can match more than
  // just the input itself — filter down to the actual <input>.
  const matches = screen.getAllByLabelText(label);
  const input = matches.find((el): el is HTMLInputElement => el.tagName === "INPUT");
  if (!input) throw new Error(`No <input> found among elements labelled "${label}"`);
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

  /**
   * End-to-end regression test for the reported bug: opening the "ev-nl-vs-keeping-petrol-car"
   * article's example share link (which omits residualValueExGst) previously landed on the
   * calculator's own unrelated current default residual ($16,745.02) instead of recomputing it
   * for the link's own financed amount ($21,122.40) — because the initial `inputs` state used
   * to merge share links over advancedDefaultInputs, whose residual is no longer the "not yet
   * computed" 0 sentinel now that it's Simple-mode-derived.
   */
  test("opening a share link that omits residualValueExGst lands directly in Advanced mode with the correct residual, not today's unrelated default", () => {
    const SHARE_LINK_C =
      "eyJ2IjoxLCJpbnB1dHMiOnsidmVoaWNsZVR5cGUiOiJFViIsInZlaGljbGVDb25kaXRpb24iOiJOZXciLCJ1c2VkQ2FyRmlyc3RIZWxkQWZ0ZXJKdWwyMDIyIjpmYWxzZSwidXNlZENhckxjdE5ldmVyUGF5YWJsZSI6ZmFsc2UsInZlaGljbGVCYXNlVmFsdWUiOjc1NTAwLCJkcml2ZWF3YXlDb3N0Ijo4MTQyMi41LCJlc3RpbWF0ZWRNYXJrZXRWYWx1ZUF0RW5kIjozMzAwMCwiYW5udWFsTWlsZWFnZUttIjoxNTAwMCwibGVhc2VEb2NGZWUiOjQ1MCwibGVhc2VTdGFydERhdGUiOiIyMDI2LTA0LTE3IiwibGVhc2VEdXJhdGlvblllYXJzIjo1LCJtb250aHNEZWZlcnJlZCI6MiwidG90YWxUYXhhYmxlSW5jb21lIjozMDAwMDAsImhvbWVMb2FuT2Zmc2V0SW50ZXJlc3RSYXRlIjo2LjEsInZlaGljbGVMZWFzZVBlckZuIjo1OTcuNDcsImx1eHVyeVZlaGljbGVBZGpQZXJGbiI6MCwiZmluYW5jZWRBbW91bnRGb3JJbnRlcmVzdENhbGNFeEdzdCI6NzU1MzguNSwic3VwZXJGcm9tUHJlTmxJbmNvbWUiOiJZZXMiLCJnc3RTYXZpbmdQYXNzZWRPbiI6IlllcyIsInNlcnZpY2VNYWludFR5cmVzQW5udWFsIjoxMDAsInNhdmVTaGFyZUFubnVhbCI6MCwicmVnaXN0cmF0aW9uQW5udWFsIjo5ODQuODgsImVsZWN0cmljaXR5QW5udWFsIjo2MzAsImZ1ZWxBbm51YWwiOjIzNjIuNSwiaW5zdXJhbmNlQW5udWFsIjoxMzAwLCJtYW5hZ2VtZW50RmVlc0FubnVhbCI6NTE2Ljg4LCJhdmdBdWRQZXJLd2giOjAuMTUsImF2Z1doUGVyS20iOjE2NSwiY29tcGFyZVdpdGhDYXJMb2FuIjpmYWxzZSwiY2FyTG9hbkluaXRpYWxEZXBvc2l0IjoxMDAwMCwiY2FyTG9hbkludGVyZXN0UmF0ZVBjdCI6NiwiY2FyTG9hbk1vbnRobHlGZWUiOjI1LCJjb21wYXJlV2l0aEN1cnJlbnRDYXIiOnRydWUsImN1cnJlbnRDYXJNYXJrZXRWYWx1ZU5vdyI6MjUwMDAsImN1cnJlbnRDYXJNYXJrZXRWYWx1ZUF0RW5kIjoxNDAwMCwiY3VycmVudFNlcnZpY2VNYWludFR5cmVzQW5udWFsIjo4MDAsImN1cnJlbnRSZWdpc3RyYXRpb25Bbm51YWwiOjkwMCwiY3VycmVudEZ1ZWxBbm51YWwiOjIzNjIuNSwiY3VycmVudEluc3VyYW5jZUFubnVhbCI6MTAwMH19";

    window.history.pushState({}, "", `/calculator/?c=${SHARE_LINK_C}`);
    render(<App />);

    // Arriving via a share link goes straight to Advanced mode — no manual switch needed.
    const residual = numberFromField(/Residual value/);
    expect(residual).toBeCloseTo(21117.05, 0);
    expect(residual).not.toBeCloseTo(16745.02, 0);
  });
});
