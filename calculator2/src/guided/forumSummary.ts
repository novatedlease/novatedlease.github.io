import type { Inputs } from "@engine/types";
import { summaryFigures } from "../components/summaryFigures";
import { superShortfallOverLease, takeHomeReductionPerFn } from "../components/payImpact";
import { PERIODS_PER_YEAR, PERIOD_UNIT, type Period } from "./draft";

export type ForumSummaryData = {
  inputs: Inputs;
  exploring: boolean;
  provider: string | null;
  horizon: "five_year" | "lease_end";
  cashNone: boolean;
  paymentPeriod: Period | null;
  answers: ReadonlyArray<readonly [string, string]>;
  assumptions: ReadonlyArray<readonly [string, string]>;
  warnings: readonly string[];
};

const aud = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

function outcome(net: number, approximate: boolean): string {
  const shown = approximate ? Math.round(Math.abs(net) / 1000) * 1000 : Math.abs(net);
  if (approximate && shown === 0) return "about the same (within $1,000)";
  return `${approximate ? "about " : ""}${aud(shown)} ${net >= 0 ? "better off" : "worse off"}`;
}

/** Plain text that can be edited before posting in a forum. Uses the same figures as the Guided headline. */
export function formatForumSummary(data: ForumSummaryData): string {
  const { inputs, exploring, provider, horizon, cashNone, paymentPeriod, answers, assumptions, warnings } = data;
  const figures = summaryFigures(inputs, horizon);
  const lines = [
    exploring ? "Novated lease estimate (no quote yet)" : "Novated lease quote — Guided calculator summary",
    ...(provider && !exploring ? [`Provider: ${provider}`] : []),
    "",
    `RESULT — over ${figures.years} years${exploring ? " (rough estimate)" : ""}`,
  ];
  const comparisons: [string, number][] = [
    ...(!cashNone ? [["paying cash", figures.totalSaving] as [string, number]] : []),
    ...(inputs.compareWithCarLoan ? [["a car loan", figures.totalSavingVsLoan] as [string, number]] : []),
    ...(inputs.compareWithCurrentCar ? [["keeping my current car", figures.nlVsKeepSaving] as [string, number]] : []),
    ...(cashNone ? [["paying cash (reference only; I don't have the cash)", figures.totalSaving] as [string, number]] : []),
  ];
  lines.push(...comparisons.map(([label, net]) => `- Versus ${label}: ${outcome(net, exploring)}`));
  const perFn = takeHomeReductionPerFn(inputs);
  if (perFn !== null) {
    const period = paymentPeriod ?? "perFn";
    lines.push(`- Take-home pay: about ${aud(perFn * 26 / PERIODS_PER_YEAR[period])} less per ${PERIOD_UNIT[period]}`);
  }
  const lostSuper = superShortfallOverLease(inputs);
  if (lostSuper >= 50) lines.push(`- Super: about ${aud(Math.round(lostSuper / 100) * 100)} less employer contribution over ${inputs.leaseDurationYears} years (not included above)`);
  lines.push("", "ANSWERS", ...answers.map(([label, value]) => `- ${label}: ${value}`));
  if (assumptions.length) lines.push("", "ASSUMPTIONS", ...assumptions.map(([label, value]) => `- ${label}: ${value}`));
  if (warnings.length) lines.push("", "WORTH CHECKING", ...warnings.map((warning) => `- ${warning}`));
  lines.push("", "What I'd like checked: [add your question here]", "", "Calculated with novatedlease.guide. This is an estimate, not a provider quote.");
  return lines.join("\n");
}
