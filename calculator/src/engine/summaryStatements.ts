import type { ScenarioResult } from "./scenarioTypes";

export type ComparisonSummary = {
  title: string;
  headlineDelta: number;   // positive means A is better than B (you choose convention)
  bullets: string[];
};

const fmt = (x: number) =>
  x.toLocaleString("en-AU", { maximumFractionDigits: 0 });

export function buildComparisonSummary(
  a: ScenarioResult,
  b: ScenarioResult
): ComparisonSummary {
  // Define “total cost” as cashflow + home-loan-interest-impact - endCarValue (optional)
  // You can tune this definition; the key is you centralise it here.
  const totalA = a.cashflowTotal + a.homeLoanInterestImpact - a.endCarValue;
  const totalB = b.cashflowTotal + b.homeLoanInterestImpact - b.endCarValue;

  const saving = totalB - totalA; // positive => A better (cheaper) than B

  const bullets: string[] = [
    `Over ${a.leaseYears} years, ${a.title} is $${fmt(saving)} better than ${b.title}.`,
    `${a.title}: $${fmt(a.cashflowTotal)} cashflow, $${fmt(a.residualPayable)} residual, $${fmt(a.homeLoanInterestImpact)} home-loan interest impact.`,
    `${b.title}: $${fmt(b.cashflowTotal)} cashflow, $${fmt(b.residualPayable)} residual, $${fmt(b.homeLoanInterestImpact)} home-loan interest impact.`,
  ];

  // Optional extra bullets if fields exist
  const chargingDelta =
    (a.breakdown?.chargingDelta ?? 0) - (b.breakdown?.chargingDelta ?? 0);
  if (Math.abs(chargingDelta) > 0.5) {
    bullets.push(
      `Electricity claim difference contributes $${fmt(chargingDelta)} in favour of ${chargingDelta > 0 ? a.title : b.title}.`
    );
  }

  bullets.push(
    `Some effects are not modelled (e.g. government subsidies). See “Adjusted Taxable Income” for secondary impacts.`
  );

  return {
    title: `${a.title} vs ${b.title}`,
    headlineDelta: saving,
    bullets,
  };
}