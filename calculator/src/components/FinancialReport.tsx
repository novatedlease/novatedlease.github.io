import type { Inputs } from "../engine/types";
import { residualPercentForYears } from "../engine/ato";
import { buildFyBreakdown } from "../engine/fy_breakdown";
import { buildWorksheet130 } from "../engine/worksheet_130";
import { useEffect } from "react";
import { estimateAnnualChargingExpense, atoChargingClaimAnnual } from "../engine/charging";
import { calcResidualPayableIncGst } from "../engine/types";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";

// NOTE: GST saving helper comes from engine/ato (single source of truth)

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

  // Actual charging cost (single source of truth)
  const chargingExpensePerYear = estimateAnnualChargingExpense(i).annualChargingExpense;

  // Include GST only if GST saving passed on in NL
  const gstMult = i.gstSavingPassedOn === "Yes" ? 1.1 : 1.0;

  // Electricity billed every 4 fortnights (fn 4, 8, ...).
  // Over N fortnights, include only floor(N/4) electricity bills.
  const chargingExpensePerFn = chargingExpensePerYear / 26;

  const electricityExpenseOverFortnights = (n: number) =>
    Math.floor(Math.max(0, Math.round(n)) / 4) * (chargingExpensePerFn * 4);

  // Non-electric running costs: spread evenly per fortnight
  const nonElectricRunningCostPerFn =
    ((i.serviceMaintTyresAnnual + i.registrationAnnual + i.insuranceAnnual) * gstMult) / 26;

  const nonNlRunningExpenseOverFortnights = (n: number) =>
    nonElectricRunningCostPerFn * Math.max(0, Math.round(n)) + electricityExpenseOverFortnights(n);

  // Packaged claim method (ATO shortcut 4.2c/km)
  const packagedChargingClaimPerYear = atoChargingClaimAnnual(i);
  const chargingDeltaAnnual = packagedChargingClaimPerYear - chargingExpensePerYear;

  // Worksheet uses NEGATIVE of LeaseReport delta, over lease years
  const chargingDeltaOverLease = -chargingDeltaAnnual * yearsLease;

  // Amount financed (ex GST) + residual payable (inc GST) — use engine single source of truth
  const amountFinancedExGst = financedAmountExGstFromInputs(i);
  const residualPct = residualPercentForYears(yearsLease);
  const residualPayableIncGst = calcResidualPayableIncGst({
    amountFinancedExGst,
    leaseDocFeeExGst: i.leaseDocFee,
    residualPct,
  });


  const preTaxLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;

  // Pre-tax running per fortnight (packaged): use ATO shortcut claim (NOT actual)
  const preTaxRunningFn =
    (i.serviceMaintTyresAnnual +
      i.saveShareAnnual +
      i.registrationAnnual +
      i.insuranceAnnual +
      i.managementFeesAnnual +
      packagedChargingClaimPerYear) /
    26;

  const preTaxTotalFn = preTaxLeaseFn + preTaxRunningFn;

  // IMPORTANT: leasePaymentsOverLease is NOT simply (preTaxTotalFn * (1 - taxRate)) * fortnights.
  // It must be computed FY-by-FY using the effective “average lease tax bracket this FY”.
  // We reuse the engine FY breakdown (same logic as LeaseReport) and sum the take-home impact.
  const fyRows = buildFyBreakdown({ inputs: i, fortnights, preTaxTotalFn });
  const leasePaymentsOverLease = fyRows.reduce((sum, r) => sum + r.takeHomeImpactPerPay * r.count, 0);

  // Post-lease running cost (real): svc/maint/tyres + rego + electricity(actual) + insurance
  const postLeaseRunningFortnights = Math.round(yearsPost * 26);
  const postLeaseRunningCost = nonNlRunningExpenseOverFortnights(postLeaseRunningFortnights);

  // Car asset value at 5 years (explicit)
  const carValueAt5Years = carValueAtYears({
    originalPrice: i.driveawayCost,
    valueAt5Years: i.estimatedMarketValueAtEnd,
    years: 5,
  });

  // --- Scenario 1: EV Bought via Novated Lease ---
  const nlTotalSpentAtLeaseEnd =
    leasePaymentsOverLease + chargingDeltaOverLease + residualPayableIncGst;
  const nlTotalSpentAt5 = nlTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 2: EV Bought via Offset Cash (simplified) ---
  const offsetRunningOverLease = nonNlRunningExpenseOverFortnights(fortnights);
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

  const loanRunningOverLease = nonNlRunningExpenseOverFortnights(fortnights);
  const loanTotalSpentAtLeaseEnd =
  i.carLoanInitialDeposit + loanPaymentTotal + loanFeesTotal + loanRunningOverLease;
  const loanTotalSpentAt5 = loanTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 4: Keeping Old Car (optional) ---
  const keepEnabled = i.compareWithCurrentCar;

  // SECTION 2 summary table columns: show optional scenarios only if enabled.
  const summaryVisibleCols: ScenarioKey[] = [
    "nl",
    "cash",
    ...(loanEnabled ? (["loan"] as const) : []),
    ...(keepEnabled ? (["keep"] as const) : []),
    ...(keepEnabled ? (["ref"] as const) : []),
  ];
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

  type ScenarioKey = "nl" | "cash" | "loan" | "keep" | "ref";

  const scenarioTitles: Record<ScenarioKey, string> = {
    nl: "New EV - Novated Lease",
    cash: "New EV - Offset Cash",
    loan: "New EV - Car Loan",
    keep: "Keep Old Car",
    ref: "Reference (No Car)",
  };

  const SummaryCombinedTable = (p: {
    visible: ScenarioKey[];
    cashRows: Array<{ label: string; values: Partial<Record<ScenarioKey, number | null>>; bold?: boolean }>;
    assetRows: Array<{ label: string; values: Partial<Record<ScenarioKey, number | null>>; bold?: boolean }>;
    liabilityRows: Array<{ label: string; values: Partial<Record<ScenarioKey, number | null>>; bold?: boolean }>;
  }) => {
    const order: ScenarioKey[] = p.visible;
    const colSpan = 1 + order.length;

    const renderRows = (
      rows: Array<{ label: string; values: Partial<Record<ScenarioKey, number | null>>; bold?: boolean }>
    ) =>
      rows.map((r, idx) => (
        <tr key={idx}>
          <td
            style={{
              textAlign: "left",
              padding: "6px 6px",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              fontWeight: r.bold ? 800 : 500,
              whiteSpace: "nowrap",
            }}
          >
            {r.label}
          </td>
          {order.map((k) => {
            const v = r.values[k];
            const cell = v === null || v === undefined ? "$ -" : money2(v);
            return (
              <td
                key={k}
                style={{
                  textAlign: "right",
                  padding: "6px 6px",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  fontWeight: r.bold ? 800 : 500,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {cell}
              </td>
            );
          })}
        </tr>
      ));

    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 6px",
                    borderBottom: "1px solid rgba(0,0,0,0.25)",
                  }}
                />
                {order.map((k) => (
                  <th
                    key={k}
                    style={{
                      textAlign: "right",
                      padding: "6px 6px",
                      borderBottom: "1px solid rgba(0,0,0,0.25)",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {scenarioTitles[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={colSpan}
                  style={{
                    padding: "8px 6px",
                    fontWeight: 900,
                    borderBottom: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.03)",
                  }}
                >
                  Cash Flow
                </td>
              </tr>
              {renderRows(p.cashRows)}

              <tr>
                <td
                  colSpan={colSpan}
                  style={{
                    padding: "12px 6px 8px",
                    fontWeight: 900,
                    borderBottom: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.03)",
                  }}
                >
                  Asset
                </td>
              </tr>
              {renderRows(p.assetRows)}

              <tr>
                <td
                  colSpan={colSpan}
                  style={{
                    padding: "12px 6px 8px",
                    fontWeight: 900,
                    borderBottom: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.03)",
                  }}
                >
                  Liability
                </td>
              </tr>
              {renderRows(p.liabilityRows)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

    // --- SECTION 2: Financial Summary ---

  // Asset values at end of lease (interpolated)
  const newEvValueAtLeaseEnd = carValueAtYears({
    originalPrice: i.driveawayCost,
    valueAt5Years: i.estimatedMarketValueAtEnd,
    years: yearsLease,
  });

  const currentCarValueAtLeaseEnd = carValueAtYears({
    originalPrice: i.currentCarMarketValueNow,
    valueAt5Years: i.currentCarMarketValueAtEnd,
    years: yearsLease,
  });

  const extraCashFromSaleOfOldCar = i.compareWithCurrentCar ? i.currentCarMarketValueNow : 0;
  const noCarCashBaseline = i.currentCarMarketValueNow; // “Reference (No Car)” cash baseline

  // Interest (“liability”) at end of lease vs at 5 years
  const irNl = interestRowsFor("nl");
  const irCash = interestRowsFor("cash");
  const irLoan = interestRowsFor("loan");
  const irKeep = interestRowsFor("keep");

  // Upfront costs
  const upfrontCash = -i.driveawayCost;
  const upfrontLoanDeposit = -i.carLoanInitialDeposit;

  // Charging delta as a BENEFIT in the summary tables (positive if claim > actual)
  const chargingDeltaBenefitOverLease = chargingDeltaAnnual * yearsLease;

  // Running cost totals
  const runningNonNlAtLeaseEnd_cashLoan = nonNlRunningExpenseOverFortnights(fortnights);
  const runningNonNlAt5_cashLoan = nonNlRunningExpenseOverFortnights(5 * 26);

  const runningNonNlAtLeaseEnd_keep = keepRunningAnnual * yearsLease;
  const runningNonNlAt5_keep = keepRunningAnnual * 5;

  // For NL: “Non-NL environment” running cost only applies after the lease ends.
  const runningNonNlAtLeaseEnd_nl = 0;
  const runningNonNlAt5_nl = postLeaseRunningCost;

  // Totals @ end of lease (cash flow)
  const cashTotalAtLeaseEnd: Record<ScenarioKey, number> = {
    nl:
      extraCashFromSaleOfOldCar +
      -leasePaymentsOverLease +
      chargingDeltaBenefitOverLease +
      -residualPayableIncGst,
    cash: extraCashFromSaleOfOldCar + upfrontCash + -runningNonNlAtLeaseEnd_cashLoan,
    loan:
      extraCashFromSaleOfOldCar +
      upfrontLoanDeposit +
      -loanPaymentTotalInclFees +
      -runningNonNlAtLeaseEnd_cashLoan,
    keep: -runningNonNlAtLeaseEnd_keep,
    ref: noCarCashBaseline,
  };

  // Totals @ 5 years (cash flow)
  const cashTotalAt5: Record<ScenarioKey, number> = {
    nl:
      extraCashFromSaleOfOldCar +
      -leasePaymentsOverLease +
      chargingDeltaBenefitOverLease +
      -residualPayableIncGst +
      -runningNonNlAt5_nl,
    cash: extraCashFromSaleOfOldCar + upfrontCash + -runningNonNlAt5_cashLoan,
    loan:
      extraCashFromSaleOfOldCar +
      upfrontLoanDeposit +
      -loanPaymentTotalInclFees +
      -runningNonNlAt5_cashLoan,
    keep: -runningNonNlAt5_keep,
    ref: noCarCashBaseline,
  };

  return (
    <div style={{ fontSize: 14, lineHeight: 1.35 }}>

      <div style={{ fontWeight: 800, marginTop: 8 }}>2.1 Summary</div>

      {yearsPost > 0 && (
        <>
          <div style={{ marginTop: 10, background: "#e6e6e6", padding: "6px 10px", fontWeight: 800 }}>
            @ {Math.round(yearsLease)} Years (End of Lease / Loan)
          </div>
          <SummaryCombinedTable
            visible={summaryVisibleCols}
            cashRows={[
              { label: "Extra Cash From Sale of Old Car", values: { nl: extraCashFromSaleOfOldCar, cash: extraCashFromSaleOfOldCar, loan: extraCashFromSaleOfOldCar, keep: null, ref: noCarCashBaseline } },
              { label: "Upfront Cost", values: { nl: null, cash: upfrontCash, loan: upfrontLoanDeposit, keep: null, ref: null } },
              { label: "Lease / Loan Payments", values: { nl: -leasePaymentsOverLease, cash: null, loan: -loanPaymentTotalInclFees, keep: null, ref: null } },
              { label: "Running Cost (Non NL Environment)", values: { nl: -runningNonNlAtLeaseEnd_nl, cash: -runningNonNlAtLeaseEnd_cashLoan, loan: -runningNonNlAtLeaseEnd_cashLoan, keep: -runningNonNlAtLeaseEnd_keep, ref: null } },
              { label: "Charging Delta", values: { nl: chargingDeltaBenefitOverLease, cash: null, loan: null, keep: null, ref: null } },
              { label: "Residual Value Payable", values: { nl: -residualPayableIncGst, cash: null, loan: null, keep: null, ref: null } },
              { label: "= Total", values: cashTotalAtLeaseEnd, bold: true },
            ]}
            assetRows={[
              { label: "Car Asset Value (Interpolated Estimate)", values: { nl: newEvValueAtLeaseEnd, cash: newEvValueAtLeaseEnd, loan: newEvValueAtLeaseEnd, keep: currentCarValueAtLeaseEnd, ref: null } },
            ]}
            liabilityRows={[
              { label: "Additional Home Loan Interest Accrued (cf. no car)", values: { nl: irNl.first, cash: irCash.first, loan: irLoan.first, keep: irKeep.first, ref: null } },
            ]}
          />
        </>
      )}

      <div style={{ marginTop: 14, background: "#e6e6e6", padding: "6px 10px", fontWeight: 800 }}>
        @ 5 Years
      </div>

      <SummaryCombinedTable
        visible={summaryVisibleCols}
        cashRows={[
          { label: "Extra Cash From Sale of Old Car", values: { nl: extraCashFromSaleOfOldCar, cash: extraCashFromSaleOfOldCar, loan: extraCashFromSaleOfOldCar, keep: null, ref: noCarCashBaseline } },
          { label: "Upfront Cost", values: { nl: null, cash: upfrontCash, loan: upfrontLoanDeposit, keep: null, ref: null } },
          { label: "Lease / Loan Payments", values: { nl: -leasePaymentsOverLease, cash: null, loan: -loanPaymentTotalInclFees, keep: null, ref: null } },
          { label: "Running Cost (Non NL Environment)", values: { nl: -runningNonNlAt5_nl, cash: -runningNonNlAt5_cashLoan, loan: -runningNonNlAt5_cashLoan, keep: -runningNonNlAt5_keep, ref: null } },
          { label: "Charging Delta", values: { nl: chargingDeltaBenefitOverLease, cash: null, loan: null, keep: null, ref: null } },
          { label: "Residual Value Payable", values: { nl: -residualPayableIncGst, cash: null, loan: null, keep: null, ref: null } },
          { label: "= Total", values: cashTotalAt5, bold: true },
        ]}
        assetRows={[
          { label: "Car Asset Value", values: { nl: i.estimatedMarketValueAtEnd, cash: i.estimatedMarketValueAtEnd, loan: i.estimatedMarketValueAtEnd, keep: i.currentCarMarketValueAtEnd, ref: null } },
        ]}
        liabilityRows={[
          { label: "Additional Home Loan Interest Accrued (cf. no car)", values: { nl: irNl.total, cash: irCash.total, loan: irLoan.total, keep: irKeep.total, ref: null } },
        ]}
      />

      <div style={{ marginTop: 14 }} />
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
            value: money2(carValueAt5Years),
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

      
    </div>
  );
}

export function computeFinancialSummary(opts: { inputs: Inputs; taxRateInclMedicarePct: number }) {
  const i = opts.inputs;

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

  // Actual charging cost (single source of truth)
  const chargingExpensePerYear = estimateAnnualChargingExpense(i).annualChargingExpense;

  // Include GST only if GST saving passed on in NL
  const gstMult = i.gstSavingPassedOn === "Yes" ? 1.1 : 1.0;

  // Electricity billed every 4 fortnights (fn 4, 8, ...).
  // Over N fortnights, include only floor(N/4) electricity bills.
  const chargingExpensePerFn = chargingExpensePerYear / 26;

  const electricityExpenseOverFortnights = (n: number) =>
    Math.floor(Math.max(0, Math.round(n)) / 4) * (chargingExpensePerFn * 4);

  // Non-electric running costs: spread evenly per fortnight
  const nonElectricRunningCostPerFn =
    ((i.serviceMaintTyresAnnual + i.registrationAnnual + i.insuranceAnnual) * gstMult) / 26;

  const nonNlRunningExpenseOverFortnights = (n: number) =>
    nonElectricRunningCostPerFn * Math.max(0, Math.round(n)) + electricityExpenseOverFortnights(n);

  // Packaged claim method (ATO shortcut 4.2c/km)
  const packagedChargingClaimPerYear = atoChargingClaimAnnual(i);
  const assumedChargingClaimPerYear = packagedChargingClaimPerYear;
  const chargingDeltaAnnual = packagedChargingClaimPerYear - chargingExpensePerYear;

  // Worksheet uses NEGATIVE of LeaseReport delta, over lease years
  const chargingDeltaOverLease = -chargingDeltaAnnual * yearsLease;

  // Amount financed (ex GST) + residual payable (inc GST) — engine single source of truth
  const amountFinancedExGst = financedAmountExGstFromInputs(i);
  const residualPct = residualPercentForYears(yearsLease);
  const residualPayableIncGst = calcResidualPayableIncGst({
    amountFinancedExGst,
    leaseDocFeeExGst: i.leaseDocFee,
    residualPct,
  });

  // Pre-tax totals (used for FY breakdown to compute take-home impact)
  const preTaxLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;

  const preTaxRunningFn =
    (i.serviceMaintTyresAnnual +
      i.saveShareAnnual +
      i.registrationAnnual +
      i.insuranceAnnual +
      i.managementFeesAnnual +
      packagedChargingClaimPerYear) /
    26;

  const preTaxTotalFn = preTaxLeaseFn + preTaxRunningFn;

  const fyRows = buildFyBreakdown({ inputs: i, fortnights, preTaxTotalFn });
  const leasePaymentsOverLease = fyRows.reduce((acc, r) => acc + r.takeHomeImpactPerPay * r.count, 0);

  // Post-lease running cost (real): svc/maint/tyres + rego + electricity(actual) + insurance
  const postLeaseRunningFortnights = Math.round(yearsPost * 26);
  const postLeaseRunningCost = nonNlRunningExpenseOverFortnights(postLeaseRunningFortnights);

  // --- Scenario 1: EV Bought via Novated Lease ---
  const nlTotalSpentAtLeaseEnd = leasePaymentsOverLease + chargingDeltaOverLease + residualPayableIncGst;
  const nlTotalSpentAt5 = nlTotalSpentAtLeaseEnd + postLeaseRunningCost;

  // --- Scenario 2: EV Bought via Offset Cash ---
  const offsetRunningOverLease = nonNlRunningExpenseOverFortnights(fortnights);
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
  const loanPaymentTotal = (-loanFnPmt) * loanFortnights;

  const loanMonths = Math.round(yearsLease * 12);
  const loanFeesTotal = i.carLoanMonthlyFee * loanMonths;
  const loanPaymentTotalInclFees = loanPaymentTotal + loanFeesTotal;

  const loanRunningOverLease = nonNlRunningExpenseOverFortnights(fortnights);
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

  // Asset values at end of lease (interpolated)
  const newEvValueAtLeaseEnd = carValueAtYears({
    originalPrice: i.driveawayCost,
    valueAt5Years: i.estimatedMarketValueAtEnd,
    years: yearsLease,
  });

  const currentCarValueAtLeaseEnd = carValueAtYears({
    originalPrice: i.currentCarMarketValueNow,
    valueAt5Years: i.currentCarMarketValueAtEnd,
    years: yearsLease,
  });

  const extraCashFromSaleOfOldCar = i.compareWithCurrentCar ? i.currentCarMarketValueNow : 0;

  // Charging delta as a BENEFIT in the summary tables (positive if claim > actual)
  const chargingDeltaBenefitOverLease = chargingDeltaAnnual * yearsLease;

  // Interest (“liability”) at end of lease vs at 5 years
  const irNl = interestRowsFor("nl");
  const irCash = interestRowsFor("cash");
  const irLoan = interestRowsFor("loan");
  const irKeep = interestRowsFor("keep");

  return {
    yearsLease,
    fortnights,
    yearsPost,

    // Charging
    chargingExpensePerYear,
    assumedChargingClaimPerYear,
    chargingDeltaAnnual,
    chargingDeltaOverLease,
    chargingDeltaBenefitOverLease,

    // Core cash totals
    leasePaymentsOverLease,
    residualPayableIncGst,
    nlTotalSpentAtLeaseEnd,
    nlTotalSpentAt5,
    offsetRunningOverLease,
    offsetTotalSpentAtLeaseEnd,
    offsetTotalSpentAt5,

    // Loan (optional)
    loanEnabled,
    loanPaymentTotalInclFees,
    loanTotalSpentAtLeaseEnd,
    loanTotalSpentAt5,

    // Keep (optional)
    keepEnabled,
    keepRunningOverLease,
    keepRunningPost,
    keepTotalSpentAt5,

    // Interest impacts
    irNl,
    irCash,
    irLoan,
    irKeep,

    // Assets + sale proceeds
    newEvValueAtLeaseEnd,
    currentCarValueAtLeaseEnd,
    extraCashFromSaleOfOldCar,
  };
}