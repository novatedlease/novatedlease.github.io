import type { Inputs } from "../engine/types";
import { residualPercentForYears } from "../engine/ato";
import { buildFyBreakdown } from "../engine/fy_breakdown";
import { buildWorksheet130 } from "../engine/worksheet_130";
import { useEffect } from "react";

// Local GST-saving helper.
// For new cars (and used dealer sales with GST), GST component is 1/11 of the GST-inclusive price.
// For private used sales (no GST), saving is zero.
// The EV NL GST saving is commonly capped at $6,334.
function gstSaved(opts: {
  vehicleCondition: "New" | "Used – dealer sale (GST inc)" | "Used – private sale (no GST)";
  vehicleBaseValue: number;
}): number {
  const cap = 6334;
  if (opts.vehicleCondition === "Used – private sale (no GST)") return 0;
  const gross = Math.max(0, opts.vehicleBaseValue);
  const gstComponent = gross / 11;
  return Math.min(cap, gstComponent);
}

function aud2(n: number): string {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money2(n: number): string {
  // Spreadsheet-style negatives in parentheses.
  if (Math.abs(n) < 0.005) return "$ -";
  if (n < 0) return `$ (${aud2(Math.abs(n))})`;
  return `$ ${aud2(n)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function carValueAtYears(opts: {
  originalPrice: number;
  valueAt5Years: number;
  years: number;
}): number {
  const { originalPrice, valueAt5Years, years } = opts;
  const y = clamp(years, 0, 5);
  if (y === 5) return valueAt5Years;
  if (originalPrice <= 0 || valueAt5Years <= 0) return 0;
  // Exponential decline: P0 * (P5/P0)^(y/5)
  return originalPrice * Math.pow(valueAt5Years / originalPrice, y / 5);
}


function pmt(rate: number, nper: number, pv: number, fv = 0): number {
  // Excel-like PMT sign convention: returns negative for cash outflow when pv > 0
  if (nper <= 0) return 0;
  if (Math.abs(rate) < 1e-12) return -(pv + fv) / nper;
  const pow = Math.pow(1 + rate, nper);
  return -(rate * (fv + pv * pow)) / (pow - 1);
}

function loanFortnightlyPayment(opts: {
  principal: number;
  annualRatePct: number; // entered as percent, e.g. 6 for 6%
  years: number;
}): number {
  const P = Math.max(0, opts.principal);
  const n = Math.max(0, Math.round(opts.years * 26));
  const annualRate = Math.max(0, opts.annualRatePct) / 100; // 6 -> 0.06
  const r = annualRate / 26;
  return pmt(r, n, P, 0); // negative (like Excel)
}

export function FinancialReport(props: { inputs: Inputs; taxRateInclMedicarePct: number }) {
  const i = props.inputs;

useEffect(() => {
  const wsNl = buildWorksheet130({ inputs: i, scenario: "nl" });
  const wsCash = buildWorksheet130({ inputs: i, scenario: "cash" });
  const wsLoan = buildWorksheet130({ inputs: i, scenario: "loan" });
  const wsKeep = buildWorksheet130({ inputs: i, scenario: "keep" });

  console.log("NL row1", wsNl[0]);

  (window as any).wsNl = wsNl;
  (window as any).wsCash = wsCash;
  (window as any).wsLoan = wsLoan;
  (window as any).wsKeep = wsKeep;
}, [i]);

  const yearsLease = clamp(i.leaseDurationYears, 0, 5);
  const fortnights = Math.round(yearsLease * 26);
  const yearsPost = Math.max(0, 5 - yearsLease);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const interestRowsFor = (scenario: "nl" | "cash" | "loan" | "keep") => {
    const ws = buildWorksheet130({ inputs: i, scenario });
    const first = sum(ws.slice(0, fortnights).map((r) => r.af));
    const subsequent = sum(ws.slice(fortnights).map((r) => r.af));
    const total = first + subsequent;
    return { first, subsequent, total };
  };

  const liabRowsFor = (scenario: "nl" | "cash" | "loan" | "keep") => {
    const ir = interestRowsFor(scenario);
    return [
      { label: `First ${Math.min(5, yearsLease)} Years`, value: money2(ir.first) },
      {
        label: `+ Subsequent ${Math.max(0, yearsPost)} Years`,
        value: yearsPost > 0 ? money2(ir.subsequent) : "$ -",
      },
      { label: "= Total", value: money2(ir.total), bold: true },
    ];
  };

  // Actual charging cost
  const kwhPerYear = (i.annualMileageKm * i.avgWhPerKm) / 1000;
  const chargingExpensePerYear =
    i.overrideAnnualChargingExpense !== undefined
      ? i.overrideAnnualChargingExpense
      : kwhPerYear * i.avgAudPerKwh;

  // NL claim method (ATO shortcut 4.2c/km)
  const assumedChargingClaimPerYear = i.annualMileageKm * 0.042;
  const chargingDeltaAnnual = assumedChargingClaimPerYear - chargingExpensePerYear;

  // Worksheet uses NEGATIVE of LeaseReport delta, over lease years
  const chargingDeltaOverLease = -chargingDeltaAnnual * yearsLease;

  // GST saving + amount financed
  const gstSavedAmt = gstSaved({
    vehicleCondition: i.vehicleCondition,
    vehicleBaseValue: i.vehicleBaseValue,
  });
  const amountFinanced = i.driveawayCost + i.leaseDocFee - gstSavedAmt;

  // Residual payable (inc GST)
  const residualPctRaw = residualPercentForYears(yearsLease);
  // Some tables return percent values (e.g. 28.13) while calculations need a fraction (0.2813).
  const residualPct = residualPctRaw > 1 ? residualPctRaw / 100 : residualPctRaw;
  const residualPayableIncGst = (amountFinanced - i.leaseDocFee) * residualPct * 1.1;


  const preTaxLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;

  // Pre-tax running per fortnight (packaged): use assumedChargingClaimPerYear (NOT actual)
  const preTaxRunningFn =
    (i.serviceMaintTyresAnnual +
      i.saveShareAnnual +
      i.registrationAnnual +
      i.insuranceAnnual +
      i.managementFeesAnnual +
      assumedChargingClaimPerYear) /
    26;

  const preTaxTotalFn = preTaxLeaseFn + preTaxRunningFn;

  // IMPORTANT: leasePaymentsOverLease is NOT simply (preTaxTotalFn * (1 - taxRate)) * fortnights.
  // It must be computed FY-by-FY using the effective “average lease tax bracket this FY”.
  // We reuse the engine FY breakdown (same logic as LeaseReport) and sum the take-home impact.
  const fyRows = buildFyBreakdown({ inputs: i, fortnights, preTaxTotalFn });
  const leasePaymentsOverLease = fyRows.reduce((sum, r) => sum + r.takeHomeImpactPerPay * r.count, 0);

  // Post-lease running cost (real): svc/maint/tyres + rego + electricity(actual) + insurance
  // Include GST only if GST saving passed on in NL
  const gstMult = i.gstSavingPassedOn === "Yes" ? 1.1 : 1.0;
  const postLeaseRunningAnnual =
  (i.serviceMaintTyresAnnual +
    i.registrationAnnual +
    i.insuranceAnnual) *
    gstMult +
  chargingExpensePerYear;
  const postLeaseRunningCost = postLeaseRunningAnnual * yearsPost;

  // Car asset value
  const carValueAtLeaseEnd = carValueAtYears({
    originalPrice: i.driveawayCost,
    valueAt5Years: i.estimatedMarketValueAtEnd,
    years: yearsLease,
  });

  // --- Scenario 1: EV Bought via Novated Lease ---
  const nlTotalSpentAtLeaseEnd =
    leasePaymentsOverLease + chargingDeltaOverLease + residualPayableIncGst;
  const nlTotalSpentAt5 = nlTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 2: EV Bought via Offset Cash (simplified) ---
  const offsetRunningAnnual =
    (i.serviceMaintTyresAnnual +
      i.registrationAnnual +
      i.insuranceAnnual) *
      gstMult +
    chargingExpensePerYear;
  const offsetRunningOverLease = offsetRunningAnnual * yearsLease;
  const offsetTotalSpentAtLeaseEnd = i.driveawayCost + offsetRunningOverLease;
  const offsetTotalSpentAt5 = offsetTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 3: EV Bought via Car Loan (optional) ---
  const loanEnabled = i.compareWithCarLoan;
  const loanPrincipal = Math.max(0, i.driveawayCost - i.carLoanInitialDeposit);
  const loanFnPmt = loanFortnightlyPayment({
  principal: loanPrincipal,
  annualRatePct: i.carLoanInterestRatePct,
  years: yearsLease,
    });

  const loanFortnights = Math.round(yearsLease * 26);

  // Convert Excel-style negative PMT into a positive “cash paid” total
  const loanPaymentTotal = (-loanFnPmt) * loanFortnights;

  // Keep your monthly fee logic as-is (still monthly)
  const loanMonths = Math.round(yearsLease * 12);
  const loanFeesTotal = i.carLoanMonthlyFee * loanMonths;
  const loanPaymentTotalInclFees = loanPaymentTotal + loanFeesTotal;

  const loanRunningOverLease = offsetRunningAnnual * yearsLease;
  const loanTotalSpentAtLeaseEnd =
  i.carLoanInitialDeposit + loanPaymentTotal + loanFeesTotal + loanRunningOverLease;
  const loanTotalSpentAt5 = loanTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 4: Keeping Old Car (optional) ---
  const keepEnabled = i.compareWithCurrentCar;
  const keepRunningAnnual =
    i.currentServiceMaintTyresAnnual +
    i.currentRegistrationAnnual +
    i.currentFuelAnnual +
    i.currentInsuranceAnnual;
  const keepRunningOverLease = keepRunningAnnual * yearsLease;
  const keepRunningPost = keepRunningAnnual * yearsPost;
  const keepTotalSpentAt5 = keepRunningOverLease + keepRunningPost;

  const Row = (p: { label: string; value: string; bold?: boolean; italic?: boolean }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "baseline",
      }}
    >
      <div
        style={{
          fontWeight: p.bold ? 700 : 400,
          fontStyle: p.italic ? "italic" : "normal",
        }}
      >
        {p.label}
      </div>
      <div
        style={{
          fontWeight: p.bold ? 700 : 400,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {p.value}
      </div>
    </div>
  );

  const SectionBlock = (p: {
    title: string;
    cashRows: Array<{ label: string; value: string; bold?: boolean }>;
    assetRows: Array<{ label: string; value: string; bold?: boolean; italic?: boolean }>;
  }) => (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          background: "#e6e6e6",
          padding: "6px 10px",
          fontWeight: 700,
          fontStyle: "italic",
        }}
      >
        {p.title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, paddingTop: 10 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Cash Flow</div>
          <div style={{ display: "grid", gap: 6 }}>
            {p.cashRows.map((r, idx) => (
              <Row key={idx} label={r.label} value={r.value} bold={r.bold} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Asset / Liability</div>
          <div style={{ display: "grid", gap: 6 }}>
            {p.assetRows.map((r, idx) => (
              <Row key={idx} label={r.label} value={r.value} bold={r.bold} italic={r.italic} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontSize: 13, lineHeight: 1.35 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>2.2 Detailed Worksheet Per Scenario</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          * does not account for sale of current car in this section
        </div>
      </div>

      <SectionBlock
        title="EV Bought via Novated Lease"
        cashRows={[
          { label: `Lease Payments over ${fortnights} fortnights`, value: money2(leasePaymentsOverLease) },
          { label: "- Charging Delta", value: money2(chargingDeltaOverLease) },
          { label: "+ Residual Value Payable", value: money2(residualPayableIncGst) },
          { label: `Total Spent at ${yearsLease} years`, value: money2(nlTotalSpentAtLeaseEnd), bold: true },
          yearsPost > 0
            ? { label: `+ Post-Lease (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) }
            : { label: "+ Post-Lease Running Cost", value: "$ -" },
          { label: "= Total Spent at 5 Years", value: money2(nlTotalSpentAt5), bold: true },
        ]}
        assetRows={[
          { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
          ...liabRowsFor("nl"),
          {
            label: "Car Value at 5 Years",
            value: money2(carValueAtLeaseEnd),
          },
        ]}
      />

      <SectionBlock
        title="EV Bought via Offset Cash"
        cashRows={[
          { label: "Driveaway Price", value: money2(i.driveawayCost) },
          { label: `+ Running Cost over ${yearsLease} Years`, value: money2(offsetRunningOverLease) },
          { label: `Total Spent at ${yearsLease} years`, value: money2(offsetTotalSpentAtLeaseEnd), bold: true },
          yearsPost > 0
            ? { label: `+ Remaining (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) }
            : { label: "+ Remaining Running Cost", value: "$ -" },
          { label: "= Total Spent at 5 Years", value: money2(offsetTotalSpentAt5), bold: true },
        ]}
        assetRows={[
          { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
          ...liabRowsFor("cash"),
          { label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) },
        ]}
      />

      {loanEnabled && (
        <SectionBlock
          title="EV Bought via Car Loan"
          cashRows={[
            { label: "Initial Deposit", value: money2(i.carLoanInitialDeposit) },
            { label: `+ Loan Payment over ${yearsLease} Years`, value: money2(loanPaymentTotalInclFees) },
            { label: `+ Running Cost over ${yearsLease} Years`, value: money2(loanRunningOverLease) },
            { label: `Total Spent at ${yearsLease} years`, value: money2(loanTotalSpentAtLeaseEnd), bold: true },
            yearsPost > 0
              ? { label: `+ Remaining (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) }
              : { label: "+ Remaining Running Cost", value: "$ -" },
            { label: "= Total Spent at 5 Years", value: money2(loanTotalSpentAt5), bold: true },
          ]}
          assetRows={[
            { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
            ...liabRowsFor("loan"),
            { label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) },
          ]}
        />
      )}

      {keepEnabled && (
        <SectionBlock
          title="Keeping Old Car"
          cashRows={[
            { label: `Running Cost over ${yearsLease} Years`, value: money2(keepRunningOverLease) },
            yearsPost > 0
              ? { label: "+ Remaining Running Cost", value: money2(keepRunningPost) }
              : { label: "+ Remaining Running Cost", value: "$ -" },
            { label: "= Total Spent at 5 Years", value: money2(keepTotalSpentAt5), bold: true },
          ]}
          assetRows={[
            { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
            ...liabRowsFor("keep"),
            { label: "Car Value at 5 Years", value: money2(i.currentCarMarketValueAtEnd) },
          ]}
        />
      )}

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Liability / additional home-loan interest is computed using the spreadsheet-style AE/AF recurrence across 130 fortnights.
      </div>
    </div>
  );
}
