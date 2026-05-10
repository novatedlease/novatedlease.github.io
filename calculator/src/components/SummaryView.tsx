import React, { useMemo } from "react";
import type { Inputs } from "../engine/types";
import { computeFinancialSummary } from "./FinancialReport";
import { InfoTooltip } from "./ui/InfoTooltip";

type Props = {
  inputs: Inputs;
  taxRateInclMedicarePct?: number;
  summaryHorizon?: "five_year" | "lease_end";
};

function fmtAud0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : "−"}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

const POS = "rgb(27, 94, 32)";
const NEG = "rgb(180, 0, 0)";
const BLUE = "rgba(11, 92, 171, 1)";

// ── Shared sub-components ──────────────────────────────────────────────────────

function CardHeader(props: { title: string; onDetails: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{props.title}</div>
      <button
        type="button"
        onClick={props.onDetails}
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(11, 92, 171, 0.35)",
          background: "rgba(11, 92, 171, 0.06)",
          color: BLUE,
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Go to Details →
      </button>
    </div>
  );
}

function Hero(props: { amount: number; suffix: string }) {
  const positive = props.amount >= 0;
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: positive ? "rgba(46, 125, 50, 0.07)" : "rgba(180, 0, 0, 0.06)",
        border: positive ? "1px solid rgba(46, 125, 50, 0.22)" : "1px solid rgba(180, 0, 0, 0.22)",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          lineHeight: 1,
          color: positive ? POS : NEG,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtAud0(Math.abs(props.amount))}
      </div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 5, lineHeight: 1.3 }}>
        {props.suffix}
      </div>
    </div>
  );
}

function BreakdownRow(props: {
  label: React.ReactNode;
  value: string;
  bold?: boolean;
  dim?: boolean;
  color?: string;
  indent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
        paddingLeft: props.indent ? 10 : 0,
      }}
    >
      <div style={{ fontSize: 13, opacity: props.dim ? 0.55 : props.bold ? 1 : 0.75 }}>
        {props.label}
      </div>
      <div
        style={{
          fontWeight: props.bold ? 900 : 600,
          fontSize: props.bold ? 14 : 13,
          color: props.color,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function Sep() {
  return <div style={{ borderTop: "1px solid rgba(0,0,0,0.10)", margin: "6px 0" }} />;
}

function DoubleSep() {
  return (
    <div style={{ margin: "6px 0" }}>
      <div style={{ borderTop: "2px solid rgba(0,0,0,0.15)" }} />
    </div>
  );
}

function Disclaimer({ inputs }: { inputs: Inputs }) {
  const navigate = (anchorId: string) =>
    window.dispatchEvent(new CustomEvent("nlguide:navigate", { detail: { tab: "Details", anchorId } }));

  return (
    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
      <div>
        ⚠️{" "}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); navigate("details-section-4-ati"); }}
          style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}
        >
          Some effects are not captured here
        </a>{" "}
        (e.g. changes in government subsidies, Medicare levy surcharge, childcare subsidy).
      </div>

      {inputs.superFromPreNlIncome === "No" && (
        <div style={{ marginTop: 5 }}>
          ⚠️ Super Guarantee may be materially reduced under this setup —{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate("details-section-5-sg"); }}
            style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}
          >
            see Details Section 5
          </a>
          .
        </div>
      )}

      <div style={{ marginTop: 5 }}>
        ⚠️ Consider{" "}
        <a
          href="https://novatedlease.guide/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: BLUE, textDecoration: "underline" }}
        >
          the broader risks and trade-offs
        </a>{" "}
        before acting on this figure alone.
      </div>
    </div>
  );
}

const electricityTooltip =
  "Why is electricity treated separately?\n\n" +
  "For most running costs under a novated lease (for example servicing, insurance, or car washes), the amount you spend and the amount you claim are the same — so the analysis can treat them as one effective cost.\n\n" +
  "Electricity is different: under the ATO EV home‑charging claim rule, the claimable amount (based on 5.47c/km) can differ materially from your actual out‑of‑pocket electricity cost. You first pay the real bill, then claim a distance‑based amount using pre‑tax income. That gap can create a genuine net gain or loss, so it needs to be shown explicitly.";

// ── Main component ─────────────────────────────────────────────────────────────

export default function SummaryView({ inputs, taxRateInclMedicarePct, summaryHorizon }: Props) {
  const s = useMemo(
    () => computeFinancialSummary({ inputs, taxRateInclMedicarePct: taxRateInclMedicarePct ?? 47 }),
    [inputs, taxRateInclMedicarePct]
  );

  const horizon: "five_year" | "lease_end" = summaryHorizon ?? "five_year";
  const isLeaseEnd = horizon === "lease_end";
  const years = isLeaseEnd ? s.yearsLease : 5;

  const nlTotalSpent       = isLeaseEnd ? s.nlTotalSpentAtLeaseEnd    : s.nlTotalSpentAt5;
  const offsetTotalSpent   = isLeaseEnd ? s.offsetTotalSpentAtLeaseEnd : s.offsetTotalSpentAt5;
  const loanTotalSpent     = isLeaseEnd ? s.loanTotalSpentAtLeaseEnd   : s.loanTotalSpentAt5;
  const keepTotalSpent     = isLeaseEnd ? s.keepTotalSpentAtLeaseEnd   : s.keepTotalSpentAt5;

  const nlInterestTotal    = isLeaseEnd ? s.irNl.first   : s.irNl.total;
  const cashInterestTotal  = isLeaseEnd ? s.irCash.first  : s.irCash.total;
  const loanInterestTotal  = isLeaseEnd ? s.irLoan.first  : s.irLoan.total;
  const keepInterestTotal  = isLeaseEnd ? s.irKeep.first  : s.irKeep.total;

  const evEndValue         = isLeaseEnd ? s.newEvValueAtLeaseEnd     : inputs.estimatedMarketValueAtEnd;
  const currentEndValue    = isLeaseEnd ? s.currentCarValueAtLeaseEnd : inputs.currentCarMarketValueAtEnd;

  const nlPostLeaseRunning = isLeaseEnd ? 0 : Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd);
  const chargingDelta      = s.chargingDeltaBenefitOverLease;
  const saleProceedsNow    = s.extraCashFromSaleOfOldCar;

  const cashflowSaving         = offsetTotalSpent - nlTotalSpent;
  const interestSaving         = nlInterestTotal - cashInterestTotal;
  const totalSaving            = cashflowSaving + interestSaving;

  const cashflowSavingVsLoan   = loanTotalSpent - nlTotalSpent;
  const interestSavingVsLoan   = nlInterestTotal - loanInterestTotal;
  const totalSavingVsLoan      = cashflowSavingVsLoan + interestSavingVsLoan;

  const assetDelta             = evEndValue - currentEndValue;
  const cashDelta              = keepTotalSpent - (nlTotalSpent - saleProceedsNow);
  const interestDelta          = nlInterestTotal - keepInterestTotal;
  const nlVsKeepSaving         = assetDelta + cashDelta + interestDelta;

  const openDetails = (anchorId?: string) =>
    window.dispatchEvent(new CustomEvent("nlguide:navigate", {
      detail: { tab: "Details", anchorId: anchorId ?? "details-section-2-financial-summary" },
    }));

  const showLoan       = inputs.compareWithCarLoan;
  const showCurrentCar = inputs.compareWithCurrentCar;
  const isEv           = inputs.vehicleType === "EV";

  // ── Card 1: NL vs Offset Cash ──────────────────────────────────────────────
  const card1 = (
    <div style={{ border: "1px solid rgba(0,0,0,0.13)", borderRadius: 14, padding: 16 }}>
      <CardHeader title={`Novated Lease vs Offset Cash — over ${years} years`} onDetails={() => openDetails()} />

      <Hero
        amount={totalSaving}
        suffix={
          totalSaving >= 0
            ? `cheaper than buying outright with offset cash over ${years} years`
            : `more expensive than buying outright with offset cash over ${years} years`
        }
      />

      <div style={{ display: "grid", gap: 4 }}>
        {/* NL side */}
        <BreakdownRow label="NL: lease payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
        <BreakdownRow label="NL: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
        {nlPostLeaseRunning > 0 && (
          <BreakdownRow label="NL: post-lease running costs" value={fmtAud0(nlPostLeaseRunning)} indent />
        )}
        {isEv && (
          <BreakdownRow
            label={<span>NL: electricity gain / loss <InfoTooltip text={electricityTooltip} /></span>}
            value={fmtSigned(chargingDelta)}
            color={chargingDelta >= 0 ? POS : NEG}
            indent
          />
        )}
        <BreakdownRow label="NL total" value={fmtAud0(nlTotalSpent)} bold />

        <Sep />

        {/* Offset Cash side */}
        <BreakdownRow label="Cash: driveaway" value={fmtAud0(inputs.driveawayCost)} indent />
        <BreakdownRow
          label="Cash: running costs"
          value={fmtAud0(Math.max(0, offsetTotalSpent - inputs.driveawayCost))}
          indent
        />
        <BreakdownRow label="Offset Cash total" value={fmtAud0(offsetTotalSpent)} bold />

        <Sep />

        {/* Saving decomposition */}
        <BreakdownRow
          label="Cashflow advantage (NL)"
          value={fmtAud0(Math.abs(cashflowSaving))}
          color={cashflowSaving >= 0 ? POS : NEG}
        />
        <BreakdownRow
          label="Home loan interest advantage (NL)"
          value={fmtAud0(Math.abs(interestSaving))}
          color={interestSaving >= 0 ? POS : NEG}
        />
        <DoubleSep />
        <BreakdownRow
          label={totalSaving >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"}
          value={fmtAud0(Math.abs(totalSaving))}
          bold
          color={totalSaving >= 0 ? POS : NEG}
        />
      </div>

      <Disclaimer inputs={inputs} />
    </div>
  );

  // ── Card 2: NL vs Car Loan ─────────────────────────────────────────────────
  const card2 = showLoan && (
    <div style={{ border: "1px solid rgba(0,0,0,0.13)", borderRadius: 14, padding: 16 }}>
      <CardHeader title={`Novated Lease vs Car Loan — over ${years} years`} onDetails={() => openDetails()} />

      <Hero
        amount={totalSavingVsLoan}
        suffix={
          totalSavingVsLoan >= 0
            ? `cheaper than a traditional car loan over ${years} years`
            : `more expensive than a traditional car loan over ${years} years`
        }
      />

      <div style={{ display: "grid", gap: 4 }}>
        <BreakdownRow label="NL: lease payments" value={fmtAud0(s.leasePaymentsOverLease)} indent />
        <BreakdownRow label="NL: residual payout" value={fmtAud0(s.residualPayableIncGst)} indent />
        {nlPostLeaseRunning > 0 && (
          <BreakdownRow label="NL: post-lease running costs" value={fmtAud0(nlPostLeaseRunning)} indent />
        )}
        {isEv && (
          <BreakdownRow
            label={<span>NL: electricity gain / loss <InfoTooltip text={electricityTooltip} /></span>}
            value={fmtSigned(chargingDelta)}
            color={chargingDelta >= 0 ? POS : NEG}
            indent
          />
        )}
        <BreakdownRow label="NL total" value={fmtAud0(nlTotalSpent)} bold />

        <Sep />

        <BreakdownRow label="Loan: initial deposit" value={fmtAud0(inputs.carLoanInitialDeposit)} indent />
        <BreakdownRow label="Loan: repayments + fees" value={fmtAud0(s.loanPaymentTotalInclFees)} indent />
        <BreakdownRow
          label="Loan: running costs"
          value={fmtAud0(Math.max(0, loanTotalSpent - (inputs.carLoanInitialDeposit + s.loanPaymentTotalInclFees)))}
          indent
        />
        <BreakdownRow label="Car Loan total" value={fmtAud0(loanTotalSpent)} bold />

        <Sep />

        <BreakdownRow
          label="Cashflow advantage (NL)"
          value={fmtAud0(Math.abs(cashflowSavingVsLoan))}
          color={cashflowSavingVsLoan >= 0 ? POS : NEG}
        />
        <BreakdownRow
          label="Home loan interest advantage (NL)"
          value={fmtAud0(Math.abs(interestSavingVsLoan))}
          color={interestSavingVsLoan >= 0 ? POS : NEG}
        />
        <DoubleSep />
        <BreakdownRow
          label={totalSavingVsLoan >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"}
          value={fmtAud0(Math.abs(totalSavingVsLoan))}
          bold
          color={totalSavingVsLoan >= 0 ? POS : NEG}
        />
      </div>

      <Disclaimer inputs={inputs} />
    </div>
  );

  // ── Card 3: NL vs Keeping Current Car ─────────────────────────────────────
  const card3 = showCurrentCar && (
    <div style={{ border: "1px solid rgba(0,0,0,0.13)", borderRadius: 14, padding: 16 }}>
      <CardHeader title={`Novated Lease vs Keeping Current Car — over ${years} years`} onDetails={() => openDetails()} />

      <Hero
        amount={nlVsKeepSaving}
        suffix={
          nlVsKeepSaving >= 0
            ? `cheaper than keeping your current car over ${years} years`
            : `more expensive than keeping your current car over ${years} years`
        }
      />

      <div style={{ display: "grid", gap: 4 }}>
        <BreakdownRow label="NL: total spend" value={fmtAud0(nlTotalSpent)} indent />
        <BreakdownRow label="NL: sale proceeds from current car" value={`−${fmtAud0(saleProceedsNow)}`} indent color={POS} />
        <BreakdownRow label="NL: net cashflow" value={fmtAud0(nlTotalSpent - saleProceedsNow)} bold />

        <Sep />

        <BreakdownRow label="Keep: running costs" value={fmtAud0(keepTotalSpent)} indent />
        <BreakdownRow label="Keep total" value={fmtAud0(keepTotalSpent)} bold />

        <Sep />

        <BreakdownRow
          label="Asset advantage (NL car vs current car end-value)"
          value={fmtSigned(assetDelta)}
          color={assetDelta >= 0 ? POS : NEG}
        />
        <BreakdownRow
          label="Cashflow advantage (NL)"
          value={fmtSigned(cashDelta)}
          color={cashDelta >= 0 ? POS : NEG}
        />
        <BreakdownRow
          label="Home loan interest advantage (NL)"
          value={fmtSigned(interestDelta)}
          color={interestDelta >= 0 ? POS : NEG}
        />
        <DoubleSep />
        <BreakdownRow
          label={nlVsKeepSaving >= 0 ? "Total saving (NL)" : "Total extra cost (NL)"}
          value={fmtAud0(Math.abs(nlVsKeepSaving))}
          bold
          color={nlVsKeepSaving >= 0 ? POS : NEG}
        />
      </div>

      <Disclaimer inputs={inputs} />
    </div>
  );

  // ── Footer notes ───────────────────────────────────────────────────────────
  const NoteBox = (p: { title: string; children: React.ReactNode }) => (
    <div
      style={{
        fontSize: 12,
        opacity: 0.75,
        fontStyle: "italic",
        padding: "10px 12px",
        borderLeft: "3px solid rgba(11, 92, 171, 0.4)",
        background: "rgba(11, 92, 171, 0.04)",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <strong>{p.title}</strong> {p.children}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {card1}
      {card2}
      {card3}

      <NoteBox title="Residual assumption:">
        all scenarios include the final residual payout, so the model assumes you own the car outright at the end of the
        lease. This addresses the common misconception that novated leasing is expensive because you "don't own the car."
      </NoteBox>

      <NoteBox title="Interest baseline:">
        home-loan interest figures are relative to a reference of having no car. This lets any two scenarios be cleanly
        compared against the same baseline.
      </NoteBox>
    </div>
  );
}
