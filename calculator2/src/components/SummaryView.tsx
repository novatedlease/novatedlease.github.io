import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../engineAdapter";
import { InfoTooltip } from "./ui/InfoTooltip";

/**
 * Ported from calculator/src/components/SummaryView.tsx — this is the actual
 * "Summary" tab from v1, not just its underlying computeFinancialSummary()
 * numbers. Same three-card structure (NL vs Cash, NL vs Loan, NL vs Keep),
 * same hero-number + decomposition breakdown (cashflow advantage + home-loan
 * interest advantage = total saving), same disclaimers and footer notes —
 * restyled onto the nlc- design system but the information architecture is
 * intentionally unchanged, since that's what makes it legible at a glance.
 */

type Props = { inputs: Inputs; horizon: "five_year" | "lease_end" };

function fmtAud0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}
function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : "−"}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

const POS = "#1b5e20";
const NEG = "#b40000";

function Hero(props: { amount: number; suffix: string }) {
  const positive = props.amount >= 0;
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--nlc-radius-lg)",
        background: positive ? "var(--nlc-good-light)" : "var(--nlc-bad-light)",
        border: `1px solid ${positive ? "rgba(46,125,50,0.22)" : "rgba(180,0,0,0.22)"}`,
        marginBottom: 14,
      }}
    >
      <div className="nlc-num" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: positive ? POS : NEG }}>
        {fmtAud0(Math.abs(props.amount))}
      </div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 5, lineHeight: 1.3 }}>{props.suffix}</div>
    </div>
  );
}

function BreakdownRow(props: { label: React.ReactNode; value: string; bold?: boolean; color?: string; indent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, paddingLeft: props.indent ? 10 : 0 }}>
      <div style={{ fontSize: 13, opacity: props.bold ? 1 : 0.75 }}>{props.label}</div>
      <div className="nlc-num" style={{ fontWeight: props.bold ? 900 : 600, fontSize: props.bold ? 14 : 13, color: props.color, whiteSpace: "nowrap" }}>
        {props.value}
      </div>
    </div>
  );
}

function Sep() {
  return <div style={{ borderTop: "1px solid var(--nlc-border)", margin: "6px 0" }} />;
}
function DoubleSep() {
  return <div style={{ borderTop: "2px solid var(--nlc-border-mid)", margin: "6px 0" }} />;
}

function CardHeader(props: { title: string }) {
  return <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 14 }}>{props.title}</div>;
}

function Disclaimer({ inputs }: { inputs: Inputs }) {
  return (
    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
      <div>Some effects are not captured here (e.g. changes in government subsidies, Medicare levy surcharge, childcare subsidy) — see Section 4 in Details.</div>
      {inputs.superFromPreNlIncome === "No" && (
        <div style={{ marginTop: 5 }}>Super Guarantee may be materially reduced under this setup — see Section 5 in Details.</div>
      )}
      <div style={{ marginTop: 5 }}>
        Consider{" "}
        <a href="https://novatedlease.guide/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure" target="_blank" rel="noopener noreferrer">
          the broader risks and trade-offs
        </a>{" "}
        before acting on this figure alone.
      </div>
    </div>
  );
}

const electricityTooltip =
  "Why is electricity treated separately?\n\n" +
  "For most running costs under a novated lease, the amount you spend and the amount you claim are the same. Electricity is different: under the ATO EV home-charging claim rule, the claimable amount (5.47c/km) can differ materially from your actual out-of-pocket electricity cost, which can create a genuine net gain or loss.";

function NoteBox(p: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic", padding: "10px 12px", borderLeft: "3px solid var(--nlc-blue-mid)", background: "var(--nlc-blue-light)", borderRadius: "0 8px 8px 0" }}>
      <strong>{p.title}</strong> {p.children}
    </div>
  );
}

export function SummaryView({ inputs, horizon }: Props) {
  const s = computeFinancialSummary({ inputs, taxRateInclMedicarePct: 47 });

  const isLeaseEnd = horizon === "lease_end";
  const years = isLeaseEnd ? s.yearsLease : 5;

  const nlTotalSpent = isLeaseEnd ? s.nlTotalSpentAtLeaseEnd : s.nlTotalSpentAt5;
  const offsetTotalSpent = isLeaseEnd ? s.offsetTotalSpentAtLeaseEnd : s.offsetTotalSpentAt5;
  const loanTotalSpent = isLeaseEnd ? s.loanTotalSpentAtLeaseEnd : s.loanTotalSpentAt5;
  const keepTotalSpent = isLeaseEnd ? s.keepTotalSpentAtLeaseEnd : s.keepTotalSpentAt5;

  const nlInterestTotal = isLeaseEnd ? s.irNl.first : s.irNl.total;
  const cashInterestTotal = isLeaseEnd ? s.irCash.first : s.irCash.total;
  const loanInterestTotal = isLeaseEnd ? s.irLoan.first : s.irLoan.total;
  const keepInterestTotal = isLeaseEnd ? s.irKeep.first : s.irKeep.total;

  const evEndValue = isLeaseEnd ? s.newEvValueAtLeaseEnd : inputs.estimatedMarketValueAtEnd;
  const currentEndValue = isLeaseEnd ? s.currentCarValueAtLeaseEnd : inputs.currentCarMarketValueAtEnd;

  const nlPostLeaseRunning = isLeaseEnd ? 0 : Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd);
  const chargingDelta = s.chargingDeltaBenefitOverLease;
  const saleProceedsNow = s.extraCashFromSaleOfOldCar;

  const cashflowSaving = offsetTotalSpent - nlTotalSpent;
  const interestSaving = nlInterestTotal - cashInterestTotal;
  const totalSaving = cashflowSaving + interestSaving;

  const cashflowSavingVsLoan = loanTotalSpent - nlTotalSpent;
  const interestSavingVsLoan = nlInterestTotal - loanInterestTotal;
  const totalSavingVsLoan = cashflowSavingVsLoan + interestSavingVsLoan;

  const assetDelta = evEndValue - currentEndValue;
  const cashDelta = keepTotalSpent - (nlTotalSpent - saleProceedsNow);
  const interestDelta = nlInterestTotal - keepInterestTotal;
  const nlVsKeepSaving = assetDelta + cashDelta + interestDelta;

  const showLoan = inputs.compareWithCarLoan;
  const showCurrentCar = inputs.compareWithCurrentCar;
  const isEv = inputs.vehicleType === "EV";

  const cardStyle: React.CSSProperties = { border: "1px solid var(--nlc-border)", borderRadius: "var(--nlc-radius-lg)", padding: 16 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={cardStyle}>
        <CardHeader title={`Novated Lease vs Offset Cash — over ${years} years`} />
        <Hero amount={totalSaving} suffix={totalSaving >= 0 ? `cheaper than buying outright with offset cash over ${years} years` : `more expensive than buying outright with offset cash over ${years} years`} />
        <div style={{ display: "grid", gap: 4 }}>
          <BreakdownRow label="NL: lease payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
          <BreakdownRow label="NL: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
          {nlPostLeaseRunning > 0 && <BreakdownRow label="NL: post-lease running costs" value={fmtAud0(nlPostLeaseRunning)} indent />}
          {isEv && (
            <BreakdownRow
              label={
                <span>
                  NL: electricity gain / loss <InfoTooltip text={electricityTooltip} />
                </span>
              }
              value={fmtSigned(-chargingDelta)}
              color={chargingDelta >= 0 ? POS : NEG}
              indent
            />
          )}
          <BreakdownRow label="NL total" value={fmtAud0(nlTotalSpent)} bold />
          <Sep />
          <BreakdownRow label="Cash: drive-away" value={fmtAud0(inputs.driveawayCost)} indent />
          <BreakdownRow label="Cash: running costs" value={fmtAud0(Math.max(0, offsetTotalSpent - inputs.driveawayCost))} indent />
          <BreakdownRow label="Offset Cash total" value={fmtAud0(offsetTotalSpent)} bold />
          <Sep />
          <BreakdownRow label={cashflowSaving >= 0 ? "Cashflow advantage (NL)" : "Cashflow disadvantage (NL)"} value={fmtSigned(cashflowSaving)} color={cashflowSaving >= 0 ? POS : NEG} />
          <BreakdownRow label={interestSaving >= 0 ? "Home loan interest advantage (NL)" : "Home loan interest disadvantage (NL)"} value={fmtSigned(interestSaving)} color={interestSaving >= 0 ? POS : NEG} />
          <DoubleSep />
          <BreakdownRow label={totalSaving >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"} value={fmtAud0(Math.abs(totalSaving))} bold color={totalSaving >= 0 ? POS : NEG} />
        </div>
        <Disclaimer inputs={inputs} />
      </div>

      {showLoan && (
        <div style={cardStyle}>
          <CardHeader title={`Novated Lease vs Car Loan — over ${years} years`} />
          <Hero amount={totalSavingVsLoan} suffix={totalSavingVsLoan >= 0 ? `cheaper than a traditional car loan over ${years} years` : `more expensive than a traditional car loan over ${years} years`} />
          <div style={{ display: "grid", gap: 4 }}>
            <BreakdownRow label="NL: lease payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
            <BreakdownRow label="NL: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
            {nlPostLeaseRunning > 0 && <BreakdownRow label="NL: post-lease running costs" value={fmtAud0(nlPostLeaseRunning)} indent />}
            {isEv && (
              <BreakdownRow
                label={
                  <span>
                    NL: electricity gain / loss <InfoTooltip text={electricityTooltip} />
                  </span>
                }
                value={fmtSigned(-chargingDelta)}
                color={chargingDelta >= 0 ? POS : NEG}
                indent
              />
            )}
            <BreakdownRow label="NL total" value={fmtAud0(nlTotalSpent)} bold />
            <Sep />
            <BreakdownRow label="Loan: initial deposit" value={fmtAud0(inputs.carLoanInitialDeposit)} indent />
            <BreakdownRow label="Loan: repayments + fees" value={fmtAud0(s.loanPaymentTotalInclFees)} indent />
            <BreakdownRow label="Loan: running costs" value={fmtAud0(Math.max(0, loanTotalSpent - (inputs.carLoanInitialDeposit + s.loanPaymentTotalInclFees)))} indent />
            <BreakdownRow label="Car Loan total" value={fmtAud0(loanTotalSpent)} bold />
            <Sep />
            <BreakdownRow label={cashflowSavingVsLoan >= 0 ? "Cashflow advantage (NL)" : "Cashflow disadvantage (NL)"} value={fmtSigned(cashflowSavingVsLoan)} color={cashflowSavingVsLoan >= 0 ? POS : NEG} />
            <BreakdownRow label={interestSavingVsLoan >= 0 ? "Home loan interest advantage (NL)" : "Home loan interest disadvantage (NL)"} value={fmtSigned(interestSavingVsLoan)} color={interestSavingVsLoan >= 0 ? POS : NEG} />
            <DoubleSep />
            <BreakdownRow label={totalSavingVsLoan >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"} value={fmtAud0(Math.abs(totalSavingVsLoan))} bold color={totalSavingVsLoan >= 0 ? POS : NEG} />
          </div>
          <Disclaimer inputs={inputs} />
        </div>
      )}

      {showCurrentCar && (
        <div style={cardStyle}>
          <CardHeader title={`Novated Lease vs Keeping Current Car — over ${years} years`} />
          <Hero amount={nlVsKeepSaving} suffix={nlVsKeepSaving >= 0 ? `cheaper than keeping your current car over ${years} years` : `more expensive than keeping your current car over ${years} years`} />
          <div style={{ display: "grid", gap: 4 }}>
            <BreakdownRow label="NL: total spend" value={fmtAud0(nlTotalSpent)} indent />
            <BreakdownRow label="NL: sale proceeds from current car" value={`−${fmtAud0(saleProceedsNow)}`} indent color={POS} />
            <BreakdownRow label="NL: net cashflow" value={fmtAud0(nlTotalSpent - saleProceedsNow)} bold />
            <Sep />
            <BreakdownRow label="Keep: running costs" value={fmtAud0(keepTotalSpent)} indent />
            <BreakdownRow label="Keep total" value={fmtAud0(keepTotalSpent)} bold />
            <Sep />
            <BreakdownRow label={assetDelta >= 0 ? "Asset advantage (NL car vs current car end-value)" : "Asset disadvantage (NL car vs current car end-value)"} value={fmtSigned(assetDelta)} color={assetDelta >= 0 ? POS : NEG} />
            <BreakdownRow label={cashDelta >= 0 ? "Cashflow advantage (NL)" : "Cashflow disadvantage (NL)"} value={fmtSigned(cashDelta)} color={cashDelta >= 0 ? POS : NEG} />
            <BreakdownRow label={interestDelta >= 0 ? "Home loan interest advantage (NL)" : "Home loan interest disadvantage (NL)"} value={fmtSigned(interestDelta)} color={interestDelta >= 0 ? POS : NEG} />
            <DoubleSep />
            <BreakdownRow label={nlVsKeepSaving >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"} value={fmtAud0(Math.abs(nlVsKeepSaving))} bold color={nlVsKeepSaving >= 0 ? POS : NEG} />
          </div>
          <Disclaimer inputs={inputs} />
        </div>
      )}

      <NoteBox title="Residual assumption:">
        all scenarios include the final residual payout, so the model assumes you own the car outright at the end of the lease. This addresses the common misconception that novated leasing is expensive because you "don't own the car."
      </NoteBox>
      <NoteBox title="Interest baseline:">home-loan interest figures are relative to a reference of having no car. This lets any two scenarios be cleanly compared against the same baseline.</NoteBox>
    </div>
  );
}
