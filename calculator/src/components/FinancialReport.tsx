import type { Inputs } from "../engine/types";
import { buildWorksheet130 } from "../engine/worksheet_130";
import { useEffect } from "react";
import { estimateAnnualChargingExpense } from "../engine/charging";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate } from "../engine/types";
import { computeLeasePaymentsOverLease } from "../engine/lease_payments";
import { Stat, StatGrid, SubHead } from "./ui/shared";

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

  // Non-energy running costs: spread evenly per fortnight
  const nonEnergyRunningCostPerFn =
    ((i.serviceMaintTyresAnnual + i.registrationAnnual + i.insuranceAnnual) * gstMult) / 26;

  const energyExpenseOverFortnights = (n: number) => {
    const nn = Math.max(0, Math.round(n));
    if (i.vehicleType === "EV") return electricityExpenseOverFortnights(nn);

    // Non-EV: treat fuel as a regular recurring cost (spread evenly)
    const fuelPerFn = (i.fuelAnnual * gstMult) / 26;
    return fuelPerFn * nn;
  };

  const nonNlRunningExpenseOverFortnights = (n: number) => {
    const nn = Math.max(0, Math.round(n));
    return nonEnergyRunningCostPerFn * nn + energyExpenseOverFortnights(nn);
  };

  // Packaged (claimable) electricity figure should come from InputsPanel (user-adjustable).
  // Default in InputsPanel is the ATO shortcut (5.47c/km), but users may override it.
  const packagedChargingClaimPerYear = i.vehicleType === "EV" ? i.electricityAnnual : 0;
  const chargingDeltaAnnual = i.vehicleType === "EV" ? packagedChargingClaimPerYear - chargingExpensePerYear : 0;

  // Worksheet uses NEGATIVE of LeaseReport delta, over lease years
  const chargingDeltaOverLease = -chargingDeltaAnnual * yearsLease;

  const residualPayableIncGst = i.residualValueExGst * 1.1;


  const preTaxLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;

  // Pre-tax running per fortnight (packaged): EV uses InputsPanel electricityAnnual (claimable); non-EV uses fuel.
  const packagedEnergyAnnual = i.vehicleType === "EV" ? i.electricityAnnual : i.fuelAnnual;

  const preTaxRunningFn =
    (i.serviceMaintTyresAnnual +
      i.saveShareAnnual +
      i.registrationAnnual +
      i.insuranceAnnual +
      i.managementFeesAnnual +
      packagedEnergyAnnual) /
    26;

  const preTaxTotalFn = preTaxLeaseFn + preTaxRunningFn;

  // IMPORTANT: leasePaymentsOverLease is NOT simply (preTaxTotalFn * (1 - taxRate)) * fortnights.
  // It must be computed FY-by-FY using the effective "average lease tax bracket this FY".
  // We reuse the engine FY breakdown (same logic as LeaseReport) and sum the take-home impact.
  const ecmAnnual = i.vehicleBaseValue * getEcmStatutoryRate(getLeaseFbtCategory(i));
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;

  const fbtApplies = isFbtApplicable(i);

  const actualPreTaxDeductionFn = preTaxTotalFn +
    (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

  const { leasePaymentsOverLease } = computeLeasePaymentsOverLease({
    inputs: i,
    fortnights,
    preTaxTotalFn,
    actualPreTaxDeductionFn,
    ecmPerFn,
  });

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

  // Convert Excel-style negative PMT into a positive "cash paid" total
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

  const sectionBlockColors: Record<string, string> = {
    "Novated Lease": "#0b5cab",
    "Offset Cash": "#1b5e20",
    "Car Loan": "#4527a0",
    "Keeping Old Car": "#00695c",
  };

  const SectionBlock = (p: {
    title: string;
    cashRows: Array<{ label: string; value: string; bold?: boolean }>;
    assetRows: Array<{ label: string; value: string; bold?: boolean; italic?: boolean }>;
    liabilityRows: Array<{ label: string; value: string; bold?: boolean; italic?: boolean }>;
  }) => {
    const accent = sectionBlockColors[p.title] ?? "#0b5cab";
    const [r, g, b] = [parseInt(accent.slice(1,3),16), parseInt(accent.slice(3,5),16), parseInt(accent.slice(5,7),16)];
    return (
    <div style={{ marginTop: 14, borderRadius: 10, clipPath: "inset(0 round 9px)", border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div
        style={{
          background: `rgba(${r},${g},${b},0.09)`,
          borderBottom: `2px solid rgba(${r},${g},${b},0.2)`,
          padding: "8px 12px",
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {p.title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, padding: "12px 14px" }}>
        <div style={{ paddingRight: 12, borderRight: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.8)`, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid rgba(${r},${g},${b},0.15)` }}>
            Cash Flow
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {p.cashRows.map((row, idx) => (
              <Row key={idx} label={row.label} value={row.value} bold={row.bold} />
            ))}
          </div>
        </div>
        <div style={{ paddingLeft: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.8)`, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid rgba(${r},${g},${b},0.15)` }}>
            Asset
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {p.assetRows.map((row, idx) => (
              <Row key={idx} label={row.label} value={row.value} bold={row.bold} italic={row.italic} />
            ))}
          </div>

          <div style={{ height: 12 }} />

          <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.8)`, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid rgba(${r},${g},${b},0.15)` }}>
            Liability
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {p.liabilityRows.map((row, idx) => (
              <Row key={idx} label={row.label} value={row.value} bold={row.bold} italic={row.italic} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  };

  type ScenarioKey = "nl" | "cash" | "loan" | "keep" | "ref";

  const scenarioTitles: Record<ScenarioKey, string> = {
    nl: "Novated Lease",
    cash: "Offset Cash",
    loan: "Car Loan",
    keep: "Keep Old Car",
    ref: "Reference (No Car)",
  };

  const scenarioColors: Record<ScenarioKey, string> = {
    nl: "#0b5cab",
    cash: "#1b5e20",
    loan: "#4527a0",
    keep: "#00695c",
    ref: "rgba(0,0,0,0.55)",
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
              // Cap label column width for mobile; allow wrapping
              maxWidth: 300,
              width: 300,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
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
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    background: "#4a4a4a",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                />
                {order.map((k) => (
                  <th
                    key={k}
                    style={{
                      textAlign: "right",
                      padding: "7px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      background: scenarioColors[k] ?? "#0b5cab",
                      color: "#fff",
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
                    padding: "9px 10px 7px",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: "rgba(11,92,171,0.07)",
                    color: "#0b5cab",
                    borderTop: "2px solid rgba(11,92,171,0.15)",
                    borderBottom: "1px solid rgba(11,92,171,0.12)",
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
                    padding: "9px 10px 7px",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: "rgba(11,92,171,0.07)",
                    color: "#0b5cab",
                    borderTop: "2px solid rgba(11,92,171,0.15)",
                    borderBottom: "1px solid rgba(11,92,171,0.12)",
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
                    padding: "9px 10px 7px",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: "rgba(11,92,171,0.07)",
                    color: "#0b5cab",
                    borderTop: "2px solid rgba(11,92,171,0.15)",
                    borderBottom: "1px solid rgba(11,92,171,0.12)",
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
  const noCarCashBaseline = i.currentCarMarketValueNow; // "Reference (No Car)" cash baseline

  // Interest ("liability") at end of lease vs at 5 years
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

  // For NL: "Non-NL environment" running cost only applies after the lease ends.
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
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>

      {/* ── Top stat cards ── */}
      <StatGrid>
        <Stat
          label="NL total spend at 5 years"
          value={`$${Math.round(nlTotalSpentAt5).toLocaleString("en-AU")}`}
          color="#0b5cab"
          note="Lease costs + residual + post-lease running"
        />
        <Stat
          label="Offset cash total at 5 years"
          value={`$${Math.round(offsetTotalSpentAt5).toLocaleString("en-AU")}`}
          color="#1b5e20"
          note="Upfront + running costs"
        />
        {loanEnabled && (
          <Stat
            label="Car loan total at 5 years"
            value={`$${Math.round(loanTotalSpentAt5).toLocaleString("en-AU")}`}
            color="#4527a0"
            note="Deposit + repayments + running"
          />
        )}
      </StatGrid>

      <SubHead mt={4}>2.1 Summary</SubHead>

      {yearsPost > 0 && (
        <>
          <div style={{ marginTop: 8, marginBottom: 6, fontWeight: 800, fontSize: 12, color: "#0b5cab", letterSpacing: "0.03em" }}>
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

      <div style={{ marginTop: 14, marginBottom: 6, fontWeight: 800, fontSize: 12, color: "#0b5cab", letterSpacing: "0.03em" }}>
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

      <SubHead mt={16}>2.2 Detailed Worksheet Per Scenario</SubHead>
      <div style={{ fontSize: 11.5, color: "rgba(0,0,0,0.55)", marginTop: -4, marginBottom: 10, fontStyle: "italic" }}>
        * does not account for sale of current car in this section
      </div>

      <SectionBlock
        title="Novated Lease"
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
          {
            label: "Car Value at 5 Years",
            value: money2(carValueAt5Years),
          },
        ]}
        liabilityRows={[
          { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
          ...liabRowsFor("nl"),
        ]}
      />

      <SectionBlock
        title="Offset Cash"
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
          { label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) },
        ]}
        liabilityRows={[
          { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
          ...liabRowsFor("cash"),
        ]}
      />

      {loanEnabled && (
        <SectionBlock
          title="Car Loan"
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
            { label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) },
          ]}
          liabilityRows={[
            { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
            ...liabRowsFor("loan"),
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
            { label: "Car Value at 5 Years", value: money2(i.currentCarMarketValueAtEnd) },
          ]}
          liabilityRows={[
            { label: "Additional Home Loan Interest Accrued", value: "", bold: true, italic: false },
            ...liabRowsFor("keep"),
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

  // Non-energy running costs: spread evenly per fortnight
  const nonEnergyRunningCostPerFn =
    ((i.serviceMaintTyresAnnual + i.registrationAnnual + i.insuranceAnnual) * gstMult) / 26;

  const energyExpenseOverFortnights = (n: number) => {
    const nn = Math.max(0, Math.round(n));
    if (i.vehicleType === "EV") return electricityExpenseOverFortnights(nn);

    // Non-EV: treat fuel as a regular recurring cost (spread evenly)
    const fuelPerFn = (i.fuelAnnual * gstMult) / 26;
    return fuelPerFn * nn;
  };

  const nonNlRunningExpenseOverFortnights = (n: number) => {
    const nn = Math.max(0, Math.round(n));
    return nonEnergyRunningCostPerFn * nn + energyExpenseOverFortnights(nn);
  };

  // Packaged (claimable) electricity figure should come from InputsPanel (user-adjustable).
  // Default in InputsPanel is the ATO shortcut (5.47c/km), but users may override it.
  const packagedChargingClaimPerYear = i.vehicleType === "EV" ? i.electricityAnnual : 0;
  const assumedChargingClaimPerYear = packagedChargingClaimPerYear;
  const chargingDeltaAnnual = i.vehicleType === "EV" ? packagedChargingClaimPerYear - chargingExpensePerYear : 0;

  // Worksheet uses NEGATIVE of LeaseReport delta, over lease years
  const chargingDeltaOverLease = -chargingDeltaAnnual * yearsLease;

  const residualPayableIncGst = i.residualValueExGst * 1.1;

  // Pre-tax totals (used for FY breakdown to compute take-home impact)
  const preTaxLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;

  // Pre-tax running per fortnight (packaged): EV uses InputsPanel electricityAnnual (claimable); non-EV uses fuel.
  const packagedEnergyAnnual = i.vehicleType === "EV" ? i.electricityAnnual : i.fuelAnnual;

  const preTaxRunningFn =
    (i.serviceMaintTyresAnnual +
      i.saveShareAnnual +
      i.registrationAnnual +
      i.insuranceAnnual +
      i.managementFeesAnnual +
      packagedEnergyAnnual) /
    26;

  const preTaxTotalFn = preTaxLeaseFn + preTaxRunningFn;

// IMPORTANT: leasePaymentsOverLease is NOT simply (preTaxTotalFn * (1 - taxRate)) * fortnights.
// It must be computed FY-by-FY using the effective "average lease tax bracket this FY".
// For FBT-applicable leases, the *actual* pre-tax deduction is reduced by ECM and increased by the GST credit on ECM.
const ecmAnnual = i.vehicleBaseValue * getEcmStatutoryRate(getLeaseFbtCategory(i));
const ecmPerFn = ecmAnnual / 26;
const ecmGstPerFn = ecmPerFn / 11;

const fbtApplies = isFbtApplicable(i);
const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

const { leasePaymentsOverLease } = computeLeasePaymentsOverLease({
  inputs: i,
  fortnights,
  preTaxTotalFn,
  actualPreTaxDeductionFn,
  ecmPerFn,
});

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
    const keepTotalSpentAtLeaseEnd = keepRunningOverLease;
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

  // Interest ("liability") at end of lease vs at 5 years
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
    keepTotalSpentAtLeaseEnd,
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