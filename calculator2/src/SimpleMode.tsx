import { useMemo, useState } from "react";
import type { Inputs } from "@engine/types";
import { computeFinancialSummary, computeTotalSaving } from "./engineAdapter";
import {
  defaultSimpleModeAnswers,
  deriveInputsFromSimpleAnswers,
  type SimpleModeAnswers,
} from "./assumptions";
import { VerdictBanner } from "./components/ui/VerdictBanner";
import { Section } from "./components/ui/Section";
import { CurrencyField, NumberField, PercentField, PillGroup } from "./components/ui/Field";
import { Button } from "./components/ui/Button";
import { KV, Stat, StatGrid, SubHead } from "./components/ui/shared";
import { PALETTE } from "./palette";

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

export function SimpleMode(props: { onGoAdvanced: (inputs: Inputs) => void }) {
  const [answers, setAnswers] = useState<SimpleModeAnswers>(defaultSimpleModeAnswers());
  const [showAssumptions, setShowAssumptions] = useState(false);

  function set<K extends keyof SimpleModeAnswers>(key: K, value: SimpleModeAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const { inputs, assumptions } = useMemo(() => deriveInputsFromSimpleAnswers(answers), [answers]);

  const summary = computeFinancialSummary({ inputs, taxRateInclMedicarePct: 47 });
  const horizon = inputs.leaseDurationYears >= 5 ? "at5" : "atLeaseEnd";
  const nlTotal = horizon === "at5" ? summary.nlTotalSpentAt5 : summary.nlTotalSpentAtLeaseEnd;
  const cashTotal = horizon === "at5" ? summary.offsetTotalSpentAt5 : summary.offsetTotalSpentAtLeaseEnd;
  const { interestSaving, totalSaving: betterOffBy } = computeTotalSaving({ summary, horizon });

  return (
    <div>
      <VerdictBanner
        betterOffBy={betterOffBy}
        comparedTo="buying with cash"
        sub={
          <>
            Ballpark estimate over your {inputs.leaseDurationYears}-year lease — get a real quote and switch to
            Advanced mode to check this properly.
          </>
        }
      >
        <Stat label="Estimated lease payments" value={fmtMoney(summary.leasePaymentsOverLease)} color={PALETTE.blue} />
        <Stat label="Residual at lease end" value={fmtMoney(summary.residualPayableIncGst)} color={PALETTE.purple} />
        <Stat label="Vehicle value at lease end" value={fmtMoney(summary.newEvValueAtLeaseEnd)} color={PALETTE.teal} />
        {answers.hasHomeLoanOffset && (
          <Stat
            label={interestSaving >= 0 ? "Home loan interest advantage (NL)" : "Home loan interest disadvantage (NL)"}
            value={fmtMoney(interestSaving)}
            color={interestSaving >= 0 ? "#059669" : "#dc2626"}
          />
        )}
      </VerdictBanner>

      <div className="nlc-layout">
        <div className="nlc-input-col">
          <Section title="Tell us about the car" defaultOpen>
            <PillGroup
              label="Vehicle type"
              value={answers.vehicleType}
              onChange={(v) => set("vehicleType", v)}
              options={[
                { value: "EV", label: "Electric" },
                { value: "Non-EV", label: "Petrol / diesel / hybrid" },
              ]}
            />
            <CurrencyField
              label="Approximate drive-away price"
              value={answers.driveawayCost}
              onChange={(v) => set("driveawayCost", v)}
              hint="Look this up from the dealer/manufacturer website if you don't have a quote yet."
            />
            <NumberField
              label="Annual kilometres"
              value={answers.annualMileageKm}
              onChange={(v) => set("annualMileageKm", v)}
              suffix="km/yr"
            />
          </Section>

          <Section title="Tell us about you" defaultOpen>
            <CurrencyField
              label="Your annual taxable income"
              value={answers.totalTaxableIncome}
              onChange={(v) => set("totalTaxableIncome", v)}
            />
            <NumberField
              label="Lease term"
              value={answers.leaseDurationYears}
              onChange={(v) => set("leaseDurationYears", Math.max(1, Math.min(5, v)))}
              suffix="years"
              hint="Whole years only, 1–5."
              decimals={0}
            />
            <PillGroup
              label="Do you have a home loan offset account?"
              value={answers.hasHomeLoanOffset ? "yes" : "no"}
              onChange={(v) => set("hasHomeLoanOffset", v === "yes")}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
            />
            {answers.hasHomeLoanOffset && (
              <PercentField
                label="Offset account interest rate"
                value={answers.homeLoanOffsetInterestRate}
                onChange={(v) => set("homeLoanOffsetInterestRate", v)}
                hint="Lease payments reduce what sits in offset, which slightly increases interest paid on the home loan — this estimates that effect."
              />
            )}
          </Section>
        </div>

        <div className="nlc-output-col">
          <Section title="What this means" defaultOpen>
            <StatGrid>
              <Stat label={`Novated lease, total @ ${inputs.leaseDurationYears}y`} value={fmtMoney(nlTotal)} color={PALETTE.blue} />
              <Stat label={`Cash purchase, total @ ${inputs.leaseDurationYears}y`} value={fmtMoney(cashTotal)} color="#37474f" />
            </StatGrid>
            <SubHead mt={16}>Breakdown</SubHead>
            <KV label="Estimated lease payments over the term" value={fmtMoney(summary.leasePaymentsOverLease)} />
            <KV label="Residual payable at lease end (inc GST)" value={fmtMoney(summary.residualPayableIncGst)} />
            <KV label="Estimated vehicle value at lease end" value={fmtMoney(summary.newEvValueAtLeaseEnd)} />
            {answers.hasHomeLoanOffset && (
              <KV
                label={interestSaving >= 0 ? "Home loan interest advantage (NL)" : "Home loan interest disadvantage (NL)"}
                value={`${interestSaving >= 0 ? "+" : "-"}${fmtMoney(interestSaving)}`}
              />
            )}
            <KV label="Net outcome vs cash" value={`${betterOffBy >= 0 ? "+" : "-"}${fmtMoney(betterOffBy)}`} bold highlight />
          </Section>

          <Section
            title="Assumptions we made for you"
            description="Since you didn't provide a real quote, these standard assumptions were used. Switch to Advanced mode to override any of them."
          >
            <button
              type="button"
              className="nlc-btn nlc-btn--ghost nlc-btn--sm"
              onClick={() => setShowAssumptions((v) => !v)}
              style={{ marginBottom: 10 }}
            >
              {showAssumptions ? "Hide details" : `Show ${assumptions.length} assumptions`}
            </button>
            {showAssumptions &&
              assumptions.map((a) => <KV key={a.field} label={a.label} value={a.value} />)}
          </Section>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" onClick={() => props.onGoAdvanced(inputs)}>
              Switch to Advanced mode to refine this →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
