import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LeaseAdjustModal } from "../src/components/LeaseAdjustModal";
import { bufferMonthsFor, initialMillarxDefer } from "../src/components/leaseAdjust";

afterEach(cleanup);

describe("budget reserve months", () => {
  test("Smart Leasing always holds 2", () => {
    expect(bufferMonthsFor("smart", 1)).toBe(2);
    expect(bufferMonthsFor("smart", 2)).toBe(2);
  });

  test("MillarX holds as many months as the deferral", () => {
    expect(bufferMonthsFor("millarx", 1)).toBe(1);
    expect(bufferMonthsFor("millarx", 2)).toBe(2);
  });

  test("MillarX's deferral follows the reader's answer, defaulting to 2", () => {
    expect(initialMillarxDefer(1)).toBe(1);
    expect(initialMillarxDefer(2)).toBe(2);
    expect(initialMillarxDefer(null)).toBe(2);
    expect(initialMillarxDefer(0)).toBe(2);
  });
});

function openMillarx(initialDeferMonths: number | null, initialPeriod: "perFn" | "perMonth" = "perFn") {
  const onApply = vi.fn();
  render(
    <LeaseAdjustModal
      leaseDurationYears={5}
      initialPeriod={initialPeriod}
      initialGst="exGst"
      initialDeferMonths={initialDeferMonths}
      onClose={() => {}}
      onApply={onApply}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "MillarX" }));
  return onApply;
}

function enterAndApply(amount: string) {
  fireEvent.change(screen.getByLabelText(/Finance payment, exactly as printed/), { target: { value: amount } });
  fireEvent.click(screen.getByRole("button", { name: /Use this value/ }));
}

// Real MillarX quotes, Oct 2026. The engine reads a fortnightly figure as spread over all 130
// fortnights, so the corrected figure is the financier payment × (60 − deferral) / 130.
describe("MillarX in the correction tool", () => {
  test("Mazda 6e, 2 months deferred: $378 a fortnight → $365.40 (= $819 × 58 / 130)", () => {
    const onApply = openMillarx(2);
    enterAndApply("378");
    expect(onApply.mock.calls[0][0]).toBeCloseTo(365.4, 2);
  });

  test("the same quote's '$819/mth × 58' line, entered per month, gives the same figure", () => {
    const onApply = openMillarx(2, "perMonth");
    enterAndApply("819");
    const [perFn, shown] = onApply.mock.calls[0];
    expect(perFn).toBeCloseTo((819 * 58) / 130, 2);
    expect(shown).toEqual({ amount: 791.7, period: "perMonth", gst: "exGst" });
  });

  test("XPeng L03, 1 month deferred: finance-only $376.70 a fortnight → $370.42", () => {
    const onApply = openMillarx(1);
    enterAndApply("376.70");
    expect(onApply.mock.calls[0][0]).toBeCloseTo(370.42, 2);
  });

  test("the deferral can be changed in the tool", () => {
    const onApply = openMillarx(2);
    fireEvent.click(screen.getByRole("button", { name: "1 month" }));
    enterAndApply("376.70");
    expect(onApply.mock.calls[0][0]).toBeCloseTo(370.42, 2);
  });

  test("Smart Leasing has no deferral question", () => {
    render(<LeaseAdjustModal leaseDurationYears={5} onClose={() => {}} onApply={() => {}} />);
    expect(screen.queryByRole("button", { name: "1 month" })).toBeNull();
  });
});

describe("GST basis in the correction tool", () => {
  test("'Not sure' is treated as ex GST and passed back as not sure", () => {
    const onApply = vi.fn();
    render(<LeaseAdjustModal leaseDurationYears={5} initialPeriod="perFn" initialGst={null} onClose={() => {}} onApply={onApply} />);
    // No answer yet: the figure can't be used
    fireEvent.change(screen.getByLabelText(/Finance payment, exactly as printed/), { target: { value: "600" } });
    expect((screen.getByRole("button", { name: /Use this value/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Not sure" }));
    expect(screen.getByText(/treat it as excluding GST/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Use this value/ }));
    const [perFn, shown] = onApply.mock.calls[0];
    expect(perFn).toBeCloseTo(580, 2); // Smart Leasing, 58/60, no GST taken off
    expect(shown.gst).toBe("unknown");
  });

  test("an 'I'm not sure' answer from Guided arrives already chosen", () => {
    render(<LeaseAdjustModal leaseDurationYears={5} initialGst="unknown" onClose={() => {}} onApply={() => {}} />);
    expect(screen.getByRole("button", { name: "Not sure" }).getAttribute("aria-pressed")).toBe("true");
  });
});
