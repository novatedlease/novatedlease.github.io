import { useMemo } from "react";
import { deriveInputsFromSimpleAnswers, type SimpleModeAnswers } from "./assumptions";
import { Section } from "./components/ui/Section";
import { CurrencyField, NumberField, PercentField, PillGroup } from "./components/ui/Field";
import { Button } from "./components/ui/Button";
import { KV } from "./components/ui/shared";
import { InfoTooltip } from "./components/ui/InfoTooltip";
import { SummaryView } from "./components/SummaryView";

export function SimpleMode(props: {
  answers: SimpleModeAnswers;
  setAnswers: (updater: SimpleModeAnswers | ((prev: SimpleModeAnswers) => SimpleModeAnswers)) => void;
  onGoAdvanced: () => void;
  onNavigateToDetails: (anchorId?: string) => void;
}) {
  const { answers, setAnswers } = props;

  function set<K extends keyof SimpleModeAnswers>(key: K, value: SimpleModeAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const { inputs, assumptions } = useMemo(() => deriveInputsFromSimpleAnswers(answers), [answers]);
  const horizon = inputs.leaseDurationYears >= 5 ? "five_year" : "lease_end";

  return (
    <div>
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
              label="Annual mileage"
              value={answers.annualMileageKm}
              onChange={(v) => set("annualMileageKm", v)}
              suffix="km/yr"
              decimals={0}
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
          <Section
            title="Assumptions we made for you"
            description="Since you didn't provide a real quote, these standard assumptions were used. Switch to Advanced mode to override any of them."
          >
            {assumptions.map((a) => (
              <KV
                key={a.field}
                label={a.label}
                value={a.value}
                tooltip={a.tooltip ? <InfoTooltip text={a.tooltip} /> : undefined}
              />
            ))}
          </Section>

          <SummaryView inputs={inputs} horizon={horizon} onNavigateToDetails={props.onNavigateToDetails} />
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Advanced mode has a lot more analysis and useful information — effective interest rate, take-home pay impact, super guarantee effects, worst-case scenarios, and more.
        </div>
        <Button variant="primary" onClick={() => props.onGoAdvanced()}>
          Switch to Advanced mode to refine this →
        </Button>
      </div>
    </div>
  );
}
