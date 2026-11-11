import type { Inputs } from "@engine/types";
import { summaryFigures } from "./summaryFigures";
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

type Props = {
  inputs: Inputs;
  horizon: "five_year" | "lease_end";
  onNavigateToDetails: (anchorId?: string) => void;
  /** Guided mode: adds a button to each card that opens the full breakdown in Advanced mode. */
  onMoreDetails?: (anchorId: string) => void;
  /** Shown straight after the result cards, before the assumption notes (Advanced's "What to do next"). */
  afterResults?: React.ReactNode;
  /** Guided: the caveats are shown once above the cards, so skip each card's own. */
  hideDisclaimers?: boolean;
  /** Guided: each card's link to Advanced is a single small button, not the explanatory box. */
  compactMoreDetails?: boolean;
  /** Guided: the reader said they can't pay cash, so the cash card goes after the ones they might act on. */
  cashLast?: boolean;
};

const FULL_BREAKDOWN_ANCHOR = "details-section-2-financial-summary";

/** Guided mode only: tells readers the Summary is a snapshot and Advanced has the full workings. */
function MoreDetails(props: { onClick?: (anchorId: string) => void; compact?: boolean }) {
  if (!props.onClick) return null;
  const onClick = props.onClick;
  if (props.compact)
    return (
      <button type="button" className="nlc-more-details__link" onClick={() => onClick(FULL_BREAKDOWN_ANCHOR)}>
        See full details in Advanced mode →
      </button>
    );
  return (
    <div className="nlc-more-details">
      <span>
        This is the snapshot. Advanced mode has the full workings: year-by-year lease payments and take-home pay, the effective
        interest rate, the effect on your adjusted taxable income (HECS repayments, childcare subsidy, Medicare levy surcharge),
        super, and the early-termination risk.
      </span>
      <button type="button" className="nlc-btn nlc-btn--primary nlc-btn--sm" onClick={() => onClick(FULL_BREAKDOWN_ANCHOR)}>
        See full details in Advanced mode →
      </button>
    </div>
  );
}

function fmtAud0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}
function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : "−"}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

const POS = "var(--nlc-acc-green)";
const NEG = "var(--nlc-neg)";

function Hero(props: { amount: number; suffix: string }) {
  const positive = props.amount >= 0;
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--nlc-radius-lg)",
        background: positive ? "var(--nlc-good-light)" : "var(--nlc-bad-light)",
        border: `1px solid ${positive ? "color-mix(in srgb, var(--nlc-good) 25%, transparent)" : "color-mix(in srgb, var(--nlc-bad) 25%, transparent)"}`,
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

const BLUE = "var(--nlc-blue)";

function CardHeader(props: { title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 15 }}>{props.title}</div>
    </div>
  );
}

function Disclaimer({ inputs, onNavigateToDetails }: { inputs: Inputs; onNavigateToDetails: (anchorId?: string) => void }) {
  const lines: React.ReactNode[] = [
    <>
      Some effects are not captured here (e.g. changes in government subsidies, Medicare levy surcharge, childcare subsidy) —{" "}
      <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToDetails("details-section-4-ati"); }} style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}>
        see Section 4 in Details
      </a>
      .
    </>,
  ];
  if (inputs.superFromPreNlIncome === "No") {
    lines.push(
      <>
        Super Guarantee may be materially reduced under this setup —{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToDetails("details-section-5-sg"); }} style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}>
          see Section 5 in Details
        </a>
        .
      </>
    );
  }
  lines.push(
    <>
      Consider{" "}
      <a href="https://novatedlease.guide/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure" target="_blank" rel="noopener noreferrer">
        the broader risks and trade-offs
      </a>{" "}
      before acting on this figure alone.
    </>
  );

  return (
    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
      {lines.map((line, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : 5 }}>
          {i >= lines.length - 2 && "⚠️ "}
          {line}
        </div>
      ))}
    </div>
  );
}

const electricityTooltip =
  "Why is electricity treated separately?\n\n" +
  "For most running costs under a novated lease, the amount you spend and the amount you claim are the same. Electricity is different: under the ATO EV home-charging claim rule, the claimable amount (5.47c/km) can differ materially from your actual out-of-pocket electricity cost, which can create a genuine net gain or loss.";

function NoteBox(p: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic", padding: "10px 12px", border: "1px solid var(--nlc-blue-mid)", background: "var(--nlc-blue-light)", borderRadius: 8 }}>
      <strong>{p.title}</strong> {p.children}
    </div>
  );
}

export function SummaryView({ inputs, horizon, onNavigateToDetails, onMoreDetails, afterResults, hideDisclaimers, compactMoreDetails, cashLast }: Props) {
  const {
    s,
    years,
    nlTotalSpent,
    offsetTotalSpent,
    loanTotalSpent,
    keepTotalSpent,
    nlPostLeaseRunning,
    chargingDelta,
    saleProceedsNow,
    cashflowSaving,
    interestSaving,
    totalSaving,
    cashflowSavingVsLoan,
    interestSavingVsLoan,
    totalSavingVsLoan,
    assetDelta,
    cashDelta,
    interestDelta,
    nlVsKeepSaving,
  } = summaryFigures(inputs, horizon);

  const showLoan = inputs.compareWithCarLoan;
  const showCurrentCar = inputs.compareWithCurrentCar;
  const isEv = inputs.vehicleType === "EV";

  const cardStyle: React.CSSProperties = { border: "1px solid var(--nlc-border)", borderRadius: "var(--nlc-radius-lg)", padding: 16 };

  const cashCard = (
    <div style={cardStyle}>
      <CardHeader title={`Novated lease vs paying cash — over ${years} years`} />
      <Hero amount={totalSaving} suffix={totalSaving >= 0 ? `cheaper than paying cash over ${years} years` : `more expensive than paying cash over ${years} years`} />
      <div style={{ display: "grid", gap: 4 }}>
        <BreakdownRow label="Lease: payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
        <BreakdownRow label="Lease: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
        {nlPostLeaseRunning > 0 && <BreakdownRow label="Lease: running costs after it ends" value={fmtAud0(nlPostLeaseRunning)} indent />}
        {isEv && (
          <BreakdownRow
            label={
              <span>
                Lease: electricity gain / loss <InfoTooltip text={electricityTooltip} />
              </span>
            }
            value={fmtSigned(-chargingDelta)}
            color={chargingDelta >= 0 ? POS : NEG}
            indent
          />
        )}
        <BreakdownRow label="Novated lease total" value={fmtAud0(nlTotalSpent)} bold />
        <Sep />
        <BreakdownRow label="Cash: drive-away" value={fmtAud0(inputs.driveawayCost)} indent />
        <BreakdownRow label="Cash: running costs" value={fmtAud0(Math.max(0, offsetTotalSpent - inputs.driveawayCost))} indent />
        <BreakdownRow label="Paying cash total" value={fmtAud0(offsetTotalSpent)} bold />
        <Sep />
        <BreakdownRow label={cashflowSaving >= 0 ? "Less spent with the lease" : "More spent with the lease"} value={fmtSigned(cashflowSaving)} color={cashflowSaving >= 0 ? POS : NEG} />
        <BreakdownRow label={interestSaving >= 0 ? "Home loan interest saved with the lease" : "Extra home loan interest with the lease"} value={fmtSigned(interestSaving)} color={interestSaving >= 0 ? POS : NEG} />
        <DoubleSep />
        <BreakdownRow label={totalSaving >= 0 ? "Total saving with the lease" : "Total extra cost with the lease"} value={fmtAud0(Math.abs(totalSaving))} bold color={totalSaving >= 0 ? POS : NEG} />
      </div>
      {!hideDisclaimers && <Disclaimer inputs={inputs} onNavigateToDetails={onNavigateToDetails} />}
      <MoreDetails onClick={onMoreDetails} compact={compactMoreDetails} />
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!cashLast && cashCard}

      {showLoan && (
        <div style={cardStyle}>
          <CardHeader title={`Novated lease vs a car loan — over ${years} years`} />
          <Hero amount={totalSavingVsLoan} suffix={totalSavingVsLoan >= 0 ? `cheaper than a car loan over ${years} years` : `more expensive than a car loan over ${years} years`} />
          <div style={{ display: "grid", gap: 4 }}>
            <BreakdownRow label="Lease: payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
            <BreakdownRow label="Lease: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
            {nlPostLeaseRunning > 0 && <BreakdownRow label="Lease: running costs after it ends" value={fmtAud0(nlPostLeaseRunning)} indent />}
            {isEv && (
              <BreakdownRow
                label={
                  <span>
                    Lease: electricity gain / loss <InfoTooltip text={electricityTooltip} />
                  </span>
                }
                value={fmtSigned(-chargingDelta)}
                color={chargingDelta >= 0 ? POS : NEG}
                indent
              />
            )}
            <BreakdownRow label="Novated lease total" value={fmtAud0(nlTotalSpent)} bold />
            <Sep />
            <BreakdownRow label="Loan: initial deposit" value={fmtAud0(inputs.carLoanInitialDeposit)} indent />
            <BreakdownRow label="Loan: repayments + fees" value={fmtAud0(s.loanPaymentTotalInclFees)} indent />
            <BreakdownRow label="Loan: running costs" value={fmtAud0(Math.max(0, loanTotalSpent - (inputs.carLoanInitialDeposit + s.loanPaymentTotalInclFees)))} indent />
            <BreakdownRow label="Car loan total" value={fmtAud0(loanTotalSpent)} bold />
            <Sep />
            <BreakdownRow label={cashflowSavingVsLoan >= 0 ? "Less spent with the lease" : "More spent with the lease"} value={fmtSigned(cashflowSavingVsLoan)} color={cashflowSavingVsLoan >= 0 ? POS : NEG} />
            <BreakdownRow label={interestSavingVsLoan >= 0 ? "Home loan interest saved with the lease" : "Extra home loan interest with the lease"} value={fmtSigned(interestSavingVsLoan)} color={interestSavingVsLoan >= 0 ? POS : NEG} />
            <DoubleSep />
            <BreakdownRow label={totalSavingVsLoan >= 0 ? "Total saving with the lease" : "Total extra cost with the lease"} value={fmtAud0(Math.abs(totalSavingVsLoan))} bold color={totalSavingVsLoan >= 0 ? POS : NEG} />
          </div>
          {!hideDisclaimers && <Disclaimer inputs={inputs} onNavigateToDetails={onNavigateToDetails} />}
          <MoreDetails onClick={onMoreDetails} compact={compactMoreDetails} />
        </div>
      )}

      {showCurrentCar && (
        <div style={cardStyle}>
          <CardHeader title={`Novated lease vs keeping your current car — over ${years} years`} />
          <Hero amount={nlVsKeepSaving} suffix={nlVsKeepSaving >= 0 ? `cheaper than keeping your current car over ${years} years` : `more expensive than keeping your current car over ${years} years`} />
          <div style={{ display: "grid", gap: 4 }}>
            <BreakdownRow label="Lease: total spend" value={fmtAud0(nlTotalSpent)} indent />
            <BreakdownRow label="Lease: sale of your current car" value={`−${fmtAud0(saleProceedsNow)}`} indent color={POS} />
            <BreakdownRow label="Lease: net spend" value={fmtAud0(nlTotalSpent - saleProceedsNow)} bold />
            <Sep />
            <BreakdownRow label="Keep: running costs" value={fmtAud0(keepTotalSpent)} indent />
            <BreakdownRow label="Keeping your car total" value={fmtAud0(keepTotalSpent)} bold />
            <Sep />
            <BreakdownRow label={assetDelta >= 0 ? "New car worth more at the end than your current car" : "New car worth less at the end than your current car"} value={fmtSigned(assetDelta)} color={assetDelta >= 0 ? POS : NEG} />
            <BreakdownRow label={cashDelta >= 0 ? "Less spent with the lease" : "More spent with the lease"} value={fmtSigned(cashDelta)} color={cashDelta >= 0 ? POS : NEG} />
            <BreakdownRow label={interestDelta >= 0 ? "Home loan interest saved with the lease" : "Extra home loan interest with the lease"} value={fmtSigned(interestDelta)} color={interestDelta >= 0 ? POS : NEG} />
            <DoubleSep />
            <BreakdownRow label={nlVsKeepSaving >= 0 ? "Total saving with the lease" : "Total extra cost with the lease"} value={fmtAud0(Math.abs(nlVsKeepSaving))} bold color={nlVsKeepSaving >= 0 ? POS : NEG} />
          </div>
          {!hideDisclaimers && <Disclaimer inputs={inputs} onNavigateToDetails={onNavigateToDetails} />}
          <MoreDetails onClick={onMoreDetails} compact={compactMoreDetails} />
        </div>
      )}

      {cashLast && cashCard}

      {afterResults}

      <NoteBox title="Residual assumption:">
        all scenarios include the final residual payout, so the model assumes you own the car outright at the end of the lease. This addresses the common misconception that novated leasing is expensive because you "don't own the car."
      </NoteBox>
      <NoteBox title="Interest baseline:">home-loan interest figures are relative to a reference of having no car. This lets any two scenarios be cleanly compared against the same baseline.</NoteBox>
    </div>
  );
}
