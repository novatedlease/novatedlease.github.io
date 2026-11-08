// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { fortnightlyLeaseFromEffectiveAnnualRate } from "@engine/effectiveinterest";
import { GuidedMode } from "../src/guided/GuidedMode";

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const type = (label: string | RegExp, value: string) => {
  const matches = screen.getAllByLabelText(label);
  const input = matches.find(
    (el): el is HTMLInputElement => el.tagName === "INPUT",
  )!;
  fireEvent.change(input, { target: { value } });
};

describe("Guided flow (real interaction)", () => {
  test("walks the wizard, catches an inc-GST residual and a monthly-as-fortnightly payment, and reaches results", () => {
    let opened: unknown = null;
    render(<GuidedMode onOpenAdvanced={(i) => (opened = i)} />);

    click("Continue");
    expect(screen.getByRole("alert").textContent).toMatch(
      /Whether you have a quote/,
    );
    // Choosing an answer moves straight on to the car
    click(/Yes, I have a quote/);
    // Cannot advance with nothing answered
    click("Next");
    expect(screen.getByRole("alert").textContent).toMatch(/Still to answer/);

    click(/Petrol, diesel or any hybrid/);
    click(/^New$/);
    fireEvent.change(document.getElementById("gd-start")!, {
      target: { value: "2026-11-20" },
    });
    click("Next");

    // Then the framing: loan and keep-current-car comparisons
    click("Next");
    expect(screen.getByRole("alert").textContent).toMatch(
      /Car loan comparison/,
    );
    click(/Yes, compare with a car loan/);
    click(/No, I'd replace it either way/);
    click("Next");

    // Prices, swapped by mistake
    type(/FBT base value/, "52400");
    type(/Drive-away price/, "48990");
    expect(
      screen
        .getAllByRole("alert")
        .some((a) => /higher than the drive-away/.test(a.textContent ?? "")),
    ).toBe(true);
    click("Next");
    expect(screen.getByText(/double-checked/)).toBeTruthy();
    type(/FBT base value/, "48990");
    type(/Drive-away price/, "52400");
    click("Next");

    // The example quote now carries the reader's own prices
    expect(document.querySelector(".gd-quote")!.textContent).toMatch(
      /\$48,990/,
    );
    expect(document.querySelector(".gd-quote")!.textContent).toMatch(
      /\$52,400/,
    );

    // Lease: doc fee is empty until answered
    click(/5 years/);
    click(/2 months/);
    click("Next");
    expect(screen.getByRole("alert").textContent).toMatch(/Documentation fee/);
    fireEvent.click(screen.getByLabelText(/no documentation fee/));
    click(/Excluding GST/);
    // ATO min is (52400 - 4764 gst saved) * 0.2813; type the inc-GST figure into the ex-GST box
    const exGst = Math.round((52400 - 52400 / 11) * 0.2813);
    type(/Residual value/, String(Math.round(exGst * 1.1)));
    expect(
      screen.getByText(/much closer to the ATO figure including GST/),
    ).toBeTruthy();
    click(/Including GST/);
    type(/Residual value/, String(Math.round(exGst * 1.1)));
    expect(screen.queryByText(/much closer to the ATO figure/)).toBeNull();
    // Not comparing with the current car, so the lease-end market value isn't asked
    expect(screen.queryByText(/market value of the car at the end/)).toBeNull();
    click("Next");

    // Payment: monthly figure entered under "per fortnight"
    click(/Any other provider/);
    click(/Per fortnight/);
    click(/^Excluding GST/);
    type(/Finance \(lease\) payment/, "1250");
    expect(screen.getByRole("alert").textContent).toMatch(
      /too high|outside any plausible|monthly amount/,
    );

    // Correct it with the true fortnightly payment
    const financed = 52400 - 52400 / 11 + 0;
    const fn = fortnightlyLeaseFromEffectiveAnnualRate({
      financedAmountExGst: financed,
      residualValueExGst: exGst,
      leaseYears: 5,
      deferMonths: 2,
      effectiveAnnualRate: 0.08,
    });
    type(/Finance \(lease\) payment/, fn.toFixed(2));
    expect(screen.getByText(/within the range we commonly see/)).toBeTruthy();
    click("Next");

    // Running costs: ex GST, entered monthly
    click(/Excluding GST/);
    click(/Monthly figure/);
    type(/Kilometres per year/, "12000");
    type(/Servicing/, "100");
    type(/Registration/, "75");
    type(/Insurance/, "133.33");
    type(/Lease management fees/, "20");
    type(/^Fuel/, "200");
    click("Next");

    // About you
    type(/annual taxable income/i, "110000");
    click(/Yes Super is unaffected/);
    click(/It doesn't earn anything/);
    click(/^No$/);
    click("Next");

    // Alternatives: loan details
    type(/Loan interest rate/, "7.5");
    fireEvent.click(screen.getByLabelText(/No deposit/));
    fireEvent.click(screen.getByLabelText(/No monthly fee/));
    click("See my results");

    expect(screen.getByText("Your answers")).toBeTruthy();
    click(/Open full workings in Advanced mode/);
    expect((opened as { driveawayCost: number }).driveawayCost).toBe(52400);
    expect((opened as { leaseDocFee: number }).leaseDocFee).toBe(0);
    expect(
      (opened as { serviceMaintTyresAnnual: number }).serviceMaintTyresAnnual,
    ).toBe(1200);
    expect((opened as { compareWithCarLoan: boolean }).compareWithCarLoan).toBe(
      true,
    );
  });

  test("exploring path: no quote, typical figures, estimate banner, switch to quote keeps answers", () => {
    render(<GuidedMode onOpenAdvanced={() => {}} />);
    click(/No, I'm just exploring/);
    click(/Electric \(EV\)/);
    click(/^New$/);
    // no exact lease-start date on the estimate path, just which side of the phase-out
    expect(document.getElementById("gd-start")).toBeNull();
    if (new Date() < new Date("2027-03-01")) click(/Before 1 April 2027/);
    click("Next");
    click(/^No, I would otherwise be paying cash/);
    click(/No, I'd replace it either way/);
    click("Next");
    type(/Approximate drive-away price/, "65000");
    click(/5 years/);
    type(/Kilometres per year/, "15000");
    click("Next");
    type(/annual taxable income/i, "110000");
    // super and NSW Health are not asked up front; the cash question is
    expect(
      screen.queryByText(/calculate super on your pre-lease salary/),
    ).toBeNull();
    click(/Home loan offset/);
    type(/Home loan interest rate/, "6.1");
    click("See my results");
    expect(
      screen.getByText(/This is an estimate, not your quote/),
    ).toBeTruthy();
    expect(screen.getByText("Assumptions we made for you")).toBeTruthy();
    expect(screen.getByText("Refine this estimate")).toBeTruthy();
    click(/No Super falls with the lease/);
    expect(screen.getByText(/super contributions would fall by about/)).toBeTruthy();
    click(/Yes Super is unaffected/);
    expect(screen.queryByText(/super contributions would fall/)).toBeNull();
    click(/I have a quote now/);
    // lands on the car screen first, which now needs a real start date
    expect(document.getElementById("gd-start")).toBeTruthy();
    fireEvent.change(document.getElementById("gd-start")!, {
      target: { value: "2026-12-20" },
    });
    click("Next");
    click("Next");
    // then the price screen, with the drive-away price kept
    expect(
      (screen.getByLabelText(/Drive-away price/) as HTMLInputElement).value,
    ).toBe("65000");
  });

  test("start over asks first, then clears every answer and returns to the intro", () => {
    render(<GuidedMode onOpenAdvanced={() => {}} />);
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    click(/Yes, I have a quote/);
    click(/Petrol, diesel or any hybrid/);

    click("Start over");
    click("Cancel");
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();

    click("Start over");
    click(/Yes, clear them/);
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    click("Continue");
    expect(screen.getByRole("alert").textContent).toMatch(
      /Whether you have a quote/,
    );
  });
});
