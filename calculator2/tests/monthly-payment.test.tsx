import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { LeaseAdjustModal } from "../src/components/LeaseAdjustModal";
import { checkPaymentCorrected, diagnosePayment } from "../src/guided/checks";
import { emptyDraft, paymentToEngineFn, type GuidedDraft } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// A monthly figure on a quote is the financier's own payment, made (term − deferral) times.
// Checked against printed rates on SG Fleet, MillarX, Toyota Fleet and Alliance quotes (Nov 2026).
describe("a monthly payment is the financier's payment", () => {
  // SG Fleet, Tesla Model Y, Nov 2026: $1,195/mth "payable as 34 payments", $520.90 per pay, 7.19% printed.
  const sgFleet = { financedExGst: 58595.68, residualExGst: 30216.62 / 1.1, leaseYears: 3, deferMonths: 2 };

  test("SG Fleet's monthly figure gives its printed 7.19%", () => {
    const diag = diagnosePayment(sgFleet, 1195, "perMonth", "exGst");
    expect(diag.rate! * 100).toBeCloseTo(7.19, 1);
  });

  test("SG Fleet's per-pay figure gives the same rate", () => {
    const monthly = diagnosePayment(sgFleet, 1195, "perMonth", "exGst").rate!;
    const perPay = diagnosePayment(sgFleet, 520.9, "perFn", "exGst").rate!;
    expect(perPay).toBeCloseTo(monthly, 3);
  });

  test("is spread over the term: $1,195 × 34 ÷ 36 × 12/26 = $520.90 a fortnight", () => {
    expect(paymentToEngineFn(1195, "perMonth", 3, 2)).toBeCloseTo(520.9, 2);
    // Per-pay figures and yearly totals are already spread
    expect(paymentToEngineFn(520.9, "perFn", 3, 2)).toBe(520.9);
    expect(paymentToEngineFn(26000, "perYear", 3, 2)).toBe(1000);
  });

  test("Smart Leasing's monthly figure equals its corrected per-pay figure", () => {
    // Sealion 7, Nov 2026: "Lease per month $1,034.94", $477.66 a fortnight, 60 months, 2 deferred
    expect(paymentToEngineFn(1034.94, "perMonth", 5, 2)).toBeCloseTo((477.66 * 58) / 60, 1);
  });

  test("a Smart Leasing / MillarX monthly figure isn't flagged as uncorrected", () => {
    expect(checkPaymentCorrected({ smartMillarx: true, corrected: false, typed: 1034.94, period: "perMonth" })).toEqual([]);
    expect(checkPaymentCorrected({ smartMillarx: true, corrected: false, typed: 477.66, period: "perFn" })[0].code).toBe(
      "payment_not_corrected",
    );
  });
});

describe("the correction tool and a monthly figure", () => {
  function open(monthlyIsFinancierPayment: boolean) {
    const onApply = vi.fn();
    render(
      <LeaseAdjustModal
        leaseDurationYears={5}
        initialPeriod="perMonth"
        initialGst="exGst"
        monthlyIsFinancierPayment={monthlyIsFinancierPayment}
        onClose={() => {}}
        onApply={onApply}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Finance payment, exactly as printed/), { target: { value: "1034.94" } });
    fireEvent.click(screen.getByRole("button", { name: /Use this value/ }));
    return onApply.mock.calls[0];
  }

  test("Guided: a monthly figure goes through unchanged", () => {
    const [, shown] = open(true);
    expect(shown).toEqual({ amount: 1034.94, period: "perMonth", gst: "exGst" });
  });

  test("Advanced: a monthly figure is still corrected, as before", () => {
    const [, shown] = open(false);
    expect(shown.amount).toBeCloseTo((1034.94 * 58) / 60, 2);
  });
});

describe("Guided payment screen, Smart Leasing / MillarX with a monthly figure", () => {
  test("says no correction is needed instead of asking for one", () => {
    const d: GuidedDraft = {
      ...emptyDraft(),
      hasQuote: true,
      vehicleType: "EV",
      vehicleCondition: "New",
      leaseYears: 5,
      monthsDeferred: 2,
      smartMillarx: true,
      paymentPeriod: "perMonth",
      paymentBasis: "exGst",
    };
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    expect(screen.getByText(/No correction needed for a monthly figure/)).toBeTruthy();
    expect(screen.queryByText(/You need to correct/)).toBeNull();
  });
});
