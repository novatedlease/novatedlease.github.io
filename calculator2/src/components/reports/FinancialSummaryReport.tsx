import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../../engineAdapter";
import { Stat, StatGrid, SubHead } from "../ui/shared";

function aud2(n: number): string {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Spreadsheet-style negatives in parentheses — matches v1's money2 exactly. */
function money2(n: number | null | undefined): string {
  if (n === null || n === undefined || Math.abs(n) < 0.005) return "$ -";
  if (n < 0) return `$ (${aud2(Math.abs(n))})`;
  return `$ ${aud2(n)}`;
}

type ScenarioKey = "nl" | "cash" | "loan" | "keep" | "ref";

const scenarioTitles: Record<ScenarioKey, string> = {
  nl: "Novated Lease",
  cash: "Offset Cash",
  loan: "Car Loan",
  keep: "Keep Old Car",
  ref: "Reference (No Car)",
};

const scenarioColors: Record<ScenarioKey, string> = {
  nl: "var(--nlc-blue)",
  cash: "var(--nlc-acc-green)",
  loan: "var(--nlc-acc-purple)",
  keep: "var(--nlc-acc-teal)",
  ref: "var(--nlc-text-dim)",
};
const scenarioSolid: Record<ScenarioKey, string> = {
  nl: "var(--nlc-blue-solid)",
  cash: "var(--nlc-acc-green-solid)",
  loan: "var(--nlc-acc-purple-solid)",
  keep: "var(--nlc-acc-teal-solid)",
  ref: "var(--nlc-grey-solid)",
};

type CombinedRow = { label: string; values: Partial<Record<ScenarioKey, number | null>>; bold?: boolean };

const groupHeaderStyle: React.CSSProperties = {
  padding: "9px 10px 7px",
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  background: "var(--nlc-blue-light)",
  color: "var(--nlc-blue)",
  borderTop: "2px solid var(--nlc-blue-mid)",
  borderBottom: "1px solid var(--nlc-blue-mid)",
};

/**
 * v1's "2.1 Summary" SummaryCombinedTable (calculator/src/components/FinancialReport.tsx
 * ~lines 362-517): one wide table per horizon with Cash Flow / Asset / Liability row
 * groups across scenario columns.
 */
function SummaryCombinedTable({
  headerLabel,
  visible,
  cashRows,
  assetRows,
  liabilityRows,
}: {
  headerLabel: string;
  visible: ScenarioKey[];
  cashRows: CombinedRow[];
  assetRows: CombinedRow[];
  liabilityRows: CombinedRow[];
}) {
  const colSpan = 1 + visible.length;
  const renderRows = (rows: CombinedRow[]) =>
    rows.map((r, idx) => (
      <tr key={idx}>
        <td style={{ textAlign: "left", padding: "6px 6px", borderBottom: "1px solid var(--nlc-border)", fontWeight: r.bold ? 800 : 500, maxWidth: 300, width: 300, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          {r.label}
        </td>
        {visible.map((k) => (
          <td key={k} style={{ textAlign: "right", padding: "6px 6px", borderBottom: "1px solid var(--nlc-border)", fontWeight: r.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {money2(r.values[k])}
          </td>
        ))}
      </tr>
    ));

  return (
    <div style={{ marginTop: 10, marginBottom: 20 }}>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--nlc-border)", boxShadow: "var(--nlc-shadow-sm)" }}>
        <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-grey-solid)", color: "#fff", whiteSpace: "nowrap" }}>
                {headerLabel}
              </th>
              {visible.map((k) => (
                <th key={k} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: scenarioSolid[k], color: "#fff", whiteSpace: "nowrap" }}>
                  {scenarioTitles[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={colSpan} style={groupHeaderStyle}>Cash Flow</td>
            </tr>
            {renderRows(cashRows)}
            <tr>
              <td colSpan={colSpan} style={groupHeaderStyle}>Asset</td>
            </tr>
            {renderRows(assetRows)}
            <tr>
              <td colSpan={colSpan} style={groupHeaderStyle}>Liability</td>
            </tr>
            {renderRows(liabilityRows)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CardRow = { label: string; value: string; bold?: boolean };

/**
 * v1's "2.2 Detailed Worksheet Per Scenario" SectionBlock (calculator/src/components/
 * FinancialReport.tsx ~lines 283-342): one card per scenario, 2-column layout (Cash
 * Flow | Asset + Liability).
 */
function SectionBlock({ title, cashRows, assetRows, liabilityRows }: { title: string; cashRows: CardRow[]; assetRows: CardRow[]; liabilityRows: CardRow[] }) {
  const accent = scenarioColors[(Object.keys(scenarioTitles) as ScenarioKey[]).find((k) => scenarioTitles[k] === title) ?? "nl"];

  const Row = (p: CardRow) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "baseline" }}>
      <div style={{ fontWeight: p.bold ? 700 : 400 }}>{p.label}</div>
      <div style={{ fontWeight: p.bold ? 700 : 400, fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }}>{p.value}</div>
    </div>
  );

  const groupLabelStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: `color-mix(in srgb, ${accent} 80%, transparent)`,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1px solid color-mix(in srgb, ${accent} 15%, transparent)`,
  };

  return (
    <div style={{ marginTop: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--nlc-border)", boxShadow: "var(--nlc-shadow-sm)" }}>
      <div style={{ background: `color-mix(in srgb, ${accent} 9%, transparent)`, borderBottom: `2px solid color-mix(in srgb, ${accent} 20%, transparent)`, padding: "8px 12px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: accent }}>
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, padding: "12px 14px" }}>
        <div style={{ paddingRight: 12, borderRight: "1px solid var(--nlc-border)" }}>
          <div style={groupLabelStyle}>Cash Flow</div>
          <div style={{ display: "grid", gap: 5 }}>
            {cashRows.map((row, idx) => <Row key={idx} {...row} />)}
          </div>
        </div>
        <div style={{ paddingLeft: 12 }}>
          <div style={groupLabelStyle}>Asset</div>
          <div style={{ display: "grid", gap: 5 }}>
            {assetRows.map((row, idx) => <Row key={idx} {...row} />)}
          </div>
          <div style={{ height: 12 }} />
          <div style={groupLabelStyle}>Liability</div>
          <div style={{ display: "grid", gap: 5 }}>
            {liabilityRows.map((row, idx) => <Row key={idx} {...row} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full port of v1's Section 2 (calculator/src/components/FinancialReport.tsx) — both
 * "2.1 Summary" (combined cashflow/asset/liability tables across pathway columns, @
 * lease-end and @ 5 years) and "2.2 Detailed Worksheet Per Scenario" (per-pathway cards
 * with the FY-split interest liability breakdown). All figures come straight out of
 * computeFinancialSummary (the same function v1 itself calls) plus raw inputs — no
 * recomputation of the underlying maths, only the rendering was re-derived.
 */
export function FinancialSummaryReport(props: { inputs: Inputs }) {
  const i = props.inputs;
  const s = computeFinancialSummary({ inputs: i });

  const { yearsLease, yearsPost, fortnights, loanEnabled, keepEnabled } = s;

  const summaryVisibleCols: ScenarioKey[] = ["nl", "cash", ...(loanEnabled ? (["loan"] as const) : []), ...(keepEnabled ? (["keep", "ref"] as const) : [])];

  const upfrontCash = -i.driveawayCost;
  const upfrontLoanDeposit = -i.carLoanInitialDeposit;
  const noCarCashBaseline = i.currentCarMarketValueNow;
  const extraCashFromSaleOfOldCar = s.extraCashFromSaleOfOldCar;

  // postLeaseRunningCost is shared across nl/cash/loan (same underlying running-cost
  // formula, added uniformly to each scenario's @5y total in v1) — derive it back out
  // rather than recomputing, since computeFinancialSummary doesn't expose it directly.
  const postLeaseRunningCost = s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd;
  const runningNonNlAtLeaseEnd_cashLoan = s.offsetRunningOverLease;
  const runningNonNlAt5_cashLoan = s.offsetTotalSpentAt5 - i.driveawayCost;
  const runningNonNlAtLeaseEnd_keep = s.keepRunningOverLease;
  const runningNonNlAt5_keep = s.keepTotalSpentAt5;

  // NOTE: these are NOT the same quantities as nlTotalSpentAt5/offsetTotalSpentAt5/etc.
  // v1's "2.1 Summary" combined-table "= Total" row sums the individual *signed cash-flow*
  // line items above (including the sale-proceeds inflow, and lease/residual as negative
  // outflows) — a different sign convention and scope from the "2.2" worksheet's "total
  // spend" figures (which exclude sale proceeds and are expressed as a positive cost). Must
  // sum the row values themselves, not reuse the *TotalSpentAt* fields.
  const cashTotalAtLeaseEnd: Partial<Record<ScenarioKey, number | null>> = {
    nl: extraCashFromSaleOfOldCar - s.leasePaymentsOverLease + s.chargingDeltaBenefitOverLease - s.residualPayableIncGst,
    cash: extraCashFromSaleOfOldCar + upfrontCash - runningNonNlAtLeaseEnd_cashLoan,
    loan: extraCashFromSaleOfOldCar + upfrontLoanDeposit - s.loanPaymentTotalInclFees - runningNonNlAtLeaseEnd_cashLoan,
    keep: -runningNonNlAtLeaseEnd_keep,
    ref: noCarCashBaseline,
  };
  const cashTotalAt5: Partial<Record<ScenarioKey, number | null>> = {
    nl: extraCashFromSaleOfOldCar - s.leasePaymentsOverLease - postLeaseRunningCost + s.chargingDeltaBenefitOverLease - s.residualPayableIncGst,
    cash: extraCashFromSaleOfOldCar + upfrontCash - runningNonNlAt5_cashLoan,
    loan: extraCashFromSaleOfOldCar + upfrontLoanDeposit - s.loanPaymentTotalInclFees - runningNonNlAt5_cashLoan,
    keep: -runningNonNlAt5_keep,
    ref: noCarCashBaseline,
  };

  const liabRowsFor = (ir: { first: number; subsequent: number; total: number }): CardRow[] => [
    { label: `First ${Math.min(5, yearsLease)} Years`, value: money2(ir.first) },
    { label: `+ Subsequent ${Math.max(0, yearsPost)} Years`, value: yearsPost > 0 ? money2(ir.subsequent) : "$ -" },
    { label: "= Total", value: money2(ir.total), bold: true },
  ];

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <StatGrid>
        <Stat label="NL total spend at 5 years" value={`$${Math.round(s.nlTotalSpentAt5).toLocaleString("en-AU")}`} color="var(--nlc-blue)" note="Lease costs + residual + post-lease running" />
        <Stat label="Offset cash total at 5 years" value={`$${Math.round(s.offsetTotalSpentAt5).toLocaleString("en-AU")}`} color="var(--nlc-acc-green)" note="Upfront + running costs" />
        {loanEnabled && <Stat label="Car loan total at 5 years" value={`$${Math.round(s.loanTotalSpentAt5).toLocaleString("en-AU")}`} color="var(--nlc-acc-purple)" note="Deposit + repayments + running" />}
      </StatGrid>

      <SubHead mt={4}>2.1 Summary</SubHead>

      {yearsPost > 0 && (
        <>
          <div style={{ marginTop: 8, marginBottom: 6, fontWeight: 800, fontSize: 12, color: "var(--nlc-blue)", letterSpacing: "0.03em" }}>
            @ {Math.round(yearsLease)} Years (End of Lease / Loan)
          </div>
          <SummaryCombinedTable
            headerLabel={`@ ${Math.round(yearsLease)}y`}
            visible={summaryVisibleCols}
            cashRows={[
              { label: "Extra Cash From Sale of Old Car", values: { nl: extraCashFromSaleOfOldCar, cash: extraCashFromSaleOfOldCar, loan: extraCashFromSaleOfOldCar, keep: null, ref: noCarCashBaseline } },
              { label: "Upfront Cost", values: { nl: null, cash: upfrontCash, loan: upfrontLoanDeposit, keep: null, ref: null } },
              { label: "Lease / Loan Payments", values: { nl: -s.leasePaymentsOverLease, cash: null, loan: -s.loanPaymentTotalInclFees, keep: null, ref: null } },
              { label: "Running Cost (Non NL Environment)", values: { nl: 0, cash: -runningNonNlAtLeaseEnd_cashLoan, loan: -runningNonNlAtLeaseEnd_cashLoan, keep: -runningNonNlAtLeaseEnd_keep, ref: null } },
              { label: "Charging Delta", values: { nl: s.chargingDeltaBenefitOverLease, cash: null, loan: null, keep: null, ref: null } },
              { label: "Residual Value Payable", values: { nl: -s.residualPayableIncGst, cash: null, loan: null, keep: null, ref: null } },
              { label: "= Total", values: cashTotalAtLeaseEnd, bold: true },
            ]}
            assetRows={[
              { label: "Car Asset Value (Interpolated Estimate)", values: { nl: s.newEvValueAtLeaseEnd, cash: s.newEvValueAtLeaseEnd, loan: s.newEvValueAtLeaseEnd, keep: s.currentCarValueAtLeaseEnd, ref: null } },
            ]}
            liabilityRows={[
              { label: "Additional Home Loan Interest Accrued (cf. no car)", values: { nl: s.irNl.first, cash: s.irCash.first, loan: s.irLoan.first, keep: s.irKeep.first, ref: null } },
            ]}
          />
        </>
      )}

      <div style={{ marginTop: 14, marginBottom: 6, fontWeight: 800, fontSize: 12, color: "var(--nlc-blue)", letterSpacing: "0.03em" }}>@ 5 Years</div>
      <SummaryCombinedTable
        headerLabel="@ 5y"
        visible={summaryVisibleCols}
        cashRows={[
          { label: "Extra Cash From Sale of Old Car", values: { nl: extraCashFromSaleOfOldCar, cash: extraCashFromSaleOfOldCar, loan: extraCashFromSaleOfOldCar, keep: null, ref: noCarCashBaseline } },
          { label: "Upfront Cost", values: { nl: null, cash: upfrontCash, loan: upfrontLoanDeposit, keep: null, ref: null } },
          { label: "Lease / Loan Payments", values: { nl: -s.leasePaymentsOverLease, cash: null, loan: -s.loanPaymentTotalInclFees, keep: null, ref: null } },
          { label: "Running Cost (Non NL Environment)", values: { nl: -postLeaseRunningCost, cash: -runningNonNlAt5_cashLoan, loan: -runningNonNlAt5_cashLoan, keep: -runningNonNlAt5_keep, ref: null } },
          { label: "Charging Delta", values: { nl: s.chargingDeltaBenefitOverLease, cash: null, loan: null, keep: null, ref: null } },
          { label: "Residual Value Payable", values: { nl: -s.residualPayableIncGst, cash: null, loan: null, keep: null, ref: null } },
          { label: "= Total", values: cashTotalAt5, bold: true },
        ]}
        assetRows={[
          { label: "Car Asset Value", values: { nl: i.estimatedMarketValueAtEnd, cash: i.estimatedMarketValueAtEnd, loan: i.estimatedMarketValueAtEnd, keep: i.currentCarMarketValueAtEnd, ref: null } },
        ]}
        liabilityRows={[
          { label: "Additional Home Loan Interest Accrued (cf. no car)", values: { nl: s.irNl.total, cash: s.irCash.total, loan: s.irLoan.total, keep: s.irKeep.total, ref: null } },
        ]}
      />

      <SubHead mt={16}>2.2 Detailed Worksheet Per Scenario</SubHead>
      <div style={{ fontSize: 11.5, color: "var(--nlc-text-muted)", marginTop: -4, marginBottom: 10, fontStyle: "italic" }}>
        * does not account for sale of current car in this section
      </div>

      <SectionBlock
        title="Novated Lease"
        cashRows={[
          { label: `Lease Payments over ${fortnights} fortnights`, value: money2(s.leasePaymentsOverLease) },
          { label: "- Charging Delta", value: money2(s.chargingDeltaOverLease) },
          { label: "+ Residual Value Payable", value: money2(s.residualPayableIncGst) },
          { label: `Total Spent at ${yearsLease} years`, value: money2(s.nlTotalSpentAtLeaseEnd), bold: true },
          yearsPost > 0 ? { label: `+ Post-Lease (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) } : { label: "+ Post-Lease Running Cost", value: "$ -" },
          { label: "= Total Spent at 5 Years", value: money2(s.nlTotalSpentAt5), bold: true },
        ]}
        assetRows={[{ label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) }]}
        liabilityRows={[{ label: "Additional Home Loan Interest Accrued", value: "", bold: true }, ...liabRowsFor(s.irNl)]}
      />

      <SectionBlock
        title="Offset Cash"
        cashRows={[
          { label: "Driveaway Price", value: money2(i.driveawayCost) },
          { label: `+ Running Cost over ${yearsLease} Years`, value: money2(s.offsetRunningOverLease) },
          { label: `Total Spent at ${yearsLease} years`, value: money2(s.offsetTotalSpentAtLeaseEnd), bold: true },
          yearsPost > 0 ? { label: `+ Remaining (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) } : { label: "+ Remaining Running Cost", value: "$ -" },
          { label: "= Total Spent at 5 Years", value: money2(s.offsetTotalSpentAt5), bold: true },
        ]}
        assetRows={[{ label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) }]}
        liabilityRows={[{ label: "Additional Home Loan Interest Accrued", value: "", bold: true }, ...liabRowsFor(s.irCash)]}
      />

      {loanEnabled && (
        <SectionBlock
          title="Car Loan"
          cashRows={[
            { label: "Initial Deposit", value: money2(i.carLoanInitialDeposit) },
            { label: `+ Loan Payment over ${yearsLease} Years`, value: money2(s.loanPaymentTotalInclFees) },
            { label: `+ Running Cost over ${yearsLease} Years`, value: money2(s.offsetRunningOverLease) },
            { label: `Total Spent at ${yearsLease} years`, value: money2(s.loanTotalSpentAtLeaseEnd), bold: true },
            yearsPost > 0 ? { label: `+ Remaining (${yearsPost} Years) Running Cost`, value: money2(postLeaseRunningCost) } : { label: "+ Remaining Running Cost", value: "$ -" },
            { label: "= Total Spent at 5 Years", value: money2(s.loanTotalSpentAt5), bold: true },
          ]}
          assetRows={[{ label: "Car Value at 5 Years", value: money2(i.estimatedMarketValueAtEnd) }]}
          liabilityRows={[{ label: "Additional Home Loan Interest Accrued", value: "", bold: true }, ...liabRowsFor(s.irLoan)]}
        />
      )}

      {keepEnabled && (
        <SectionBlock
          title="Keep Old Car"
          cashRows={[
            { label: `Running Cost over ${yearsLease} Years`, value: money2(s.keepRunningOverLease) },
            { label: "+ Remaining Running Cost", value: yearsPost > 0 ? money2(s.keepRunningPost) : "$ -" },
            { label: "= Total Spent at 5 Years", value: money2(s.keepTotalSpentAt5), bold: true },
          ]}
          assetRows={[{ label: "Car Value at 5 Years", value: money2(i.currentCarMarketValueAtEnd) }]}
          liabilityRows={[{ label: "Additional Home Loan Interest Accrued", value: "", bold: true }, ...liabRowsFor(s.irKeep)]}
        />
      )}
    </div>
  );
}
