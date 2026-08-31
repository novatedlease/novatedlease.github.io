import { useMemo, useState } from "react";
import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../engineAdapter";
import { resolveAutoFields } from "../assumptions";
import type { SavedQuoteV1 } from "../state/savedQuotes";
import { Table, th, thR, td, tdR } from "./ui/shared";

/**
 * Ported from calculator/src/components/ComparatorView.tsx. Reuses the exact
 * same pathway-extraction and validation logic (same field names/formulas).
 * Includes v1's detailed cashflow/asset/liability breakdown table (Section B) —
 * the 4-row summary ranking table shows the net numbers, but not where the
 * money actually goes per pathway.
 */

type PathwayType = "nl" | "cash" | "loan" | "keep";

const PATHWAY_COLORS: Record<PathwayType, string> = { nl: "#0b5cab", cash: "#1b5e20", loan: "#4527a0", keep: "#00695c" };
const PATHWAY_LABELS: Record<PathwayType, string> = { nl: "Novated Lease", cash: "Offset Cash", loan: "Car Loan", keep: "Keep Old Car" };

type SelectedKey = string;

type AvailablePathway = { key: SelectedKey; quoteId: string; quoteName: string; pathwayType: PathwayType; inputs: Inputs };

type PathwayNumbers = {
  extraCashFromSale: number;
  upfront: number;
  leaseOrLoanPayments: number;
  runningAtLeaseEnd: number;
  runningAt5: number;
  chargingDelta: number;
  residual: number;
  cashTotalAtLeaseEnd: number;
  cashTotalAt5: number;
  carValueAtLeaseEnd: number;
  carValueAt5: number;
  interestAtLeaseEnd: number;
  interestAt5: number;
};

function fmtAud0(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

/** Matches v1's ComparatorView money2 helper — used only by the detailed breakdown table below. */
function money2(n: number | null | undefined): string {
  if (n === null || n === undefined || Math.abs(n) < 0.005) return "$ -";
  const fmt = Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `$ (${fmt})` : `$ ${fmt}`;
}

type BreakdownColumn = { key: SelectedKey; color: string; nums: PathwayNumbers; pathwayType: PathwayType; quoteName: string };
type BreakdownRowDef = { label: string; getValue: (col: BreakdownColumn, leaseEnd: boolean) => number | null; bold?: boolean };

/**
 * One "Section B" table (Cash Flow / Asset / Liability row groups) for a single horizon.
 * Ported from calculator/src/components/ComparatorView.tsx ~lines 1084 onward.
 */
function DetailedBreakdownTable({
  headerLabel,
  leaseEnd,
  ranked,
  cashFlowRows,
  assetRows,
  liabilityRows,
}: {
  headerLabel: string;
  leaseEnd: boolean;
  ranked: BreakdownColumn[];
  cashFlowRows: BreakdownRowDef[];
  assetRows: BreakdownRowDef[];
  liabilityRows: BreakdownRowDef[];
}) {
  const groupHeaderStyle: React.CSSProperties = {
    padding: "9px 10px 7px",
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    background: "rgba(11,92,171,0.07)",
    color: "#0b5cab",
    borderTop: "2px solid rgba(11,92,171,0.15)",
    borderBottom: "1px solid rgba(11,92,171,0.12)",
  };
  const rowGroups: Array<{ title: string; rows: BreakdownRowDef[] }> = [
    { title: "Cash Flow", rows: cashFlowRows },
    { title: "Asset", rows: assetRows },
    { title: "Liability", rows: liabilityRows },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: "var(--nlc-blue)", letterSpacing: "0.03em", marginBottom: 6 }}>{headerLabel}</div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--nlc-border)", boxShadow: "var(--nlc-shadow-sm)" }}>
        <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>{headerLabel}</th>
              {ranked.map((col) => (
                <th key={col.key} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, background: col.color, color: "#fff", whiteSpace: "nowrap" }}>
                  {col.pathwayType !== "keep" && <div style={{ fontWeight: 900 }}>{col.quoteName}</div>}
                  <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowGroups.map((group) => (
              <>
                <tr key={`${group.title}-header`}>
                  <td colSpan={1 + ranked.length} style={groupHeaderStyle}>
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row, idx) => (
                  <tr key={`${group.title}-${idx}`}>
                    <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--nlc-border)", fontWeight: row.bold ? 800 : 500, maxWidth: 300 }}>{row.label}</td>
                    {ranked.map((col) => {
                      const v = row.getValue(col, leaseEnd);
                      return (
                        <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid var(--nlc-border)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {money2(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Exported for direct unit testing — see tests/comparator.test.tsx. */
export function extractPathwayNumbers(s: ReturnType<typeof computeFinancialSummary>, inputs: Inputs, pathwayType: PathwayType): PathwayNumbers {
  const extraCashFromSale = pathwayType === "keep" ? 0 : s.extraCashFromSaleOfOldCar;
  const postLeaseRunning = s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd;
  const loanRunningAtLeaseEnd = s.loanTotalSpentAtLeaseEnd - inputs.carLoanInitialDeposit - s.loanPaymentTotalInclFees;
  const loanRunningAt5 = s.loanTotalSpentAt5 - inputs.carLoanInitialDeposit - s.loanPaymentTotalInclFees;
  const cashRunningAtLeaseEnd = s.offsetRunningOverLease;
  const cashRunningAt5 = s.offsetTotalSpentAt5 - inputs.driveawayCost;
  const isEv = inputs.vehicleType === "EV";

  let upfront = 0;
  let leaseOrLoanPayments = 0;
  let runningAtLeaseEnd = 0;
  let runningAt5 = 0;
  let chargingDelta = 0;
  let residual = 0;
  let carValueAtLeaseEnd = 0;
  let carValueAt5 = 0;

  switch (pathwayType) {
    case "nl":
      leaseOrLoanPayments = -s.leasePaymentsOverLease;
      runningAt5 = -postLeaseRunning;
      chargingDelta = isEv ? s.chargingDeltaBenefitOverLease : 0;
      residual = -s.residualPayableIncGst;
      carValueAtLeaseEnd = s.newEvValueAtLeaseEnd;
      carValueAt5 = inputs.estimatedMarketValueAtEnd;
      break;
    case "cash":
      upfront = -inputs.driveawayCost;
      runningAtLeaseEnd = -cashRunningAtLeaseEnd;
      runningAt5 = -cashRunningAt5;
      carValueAtLeaseEnd = s.newEvValueAtLeaseEnd;
      carValueAt5 = inputs.estimatedMarketValueAtEnd;
      break;
    case "loan":
      upfront = -inputs.carLoanInitialDeposit;
      leaseOrLoanPayments = -s.loanPaymentTotalInclFees;
      runningAtLeaseEnd = -loanRunningAtLeaseEnd;
      runningAt5 = -loanRunningAt5;
      carValueAtLeaseEnd = s.newEvValueAtLeaseEnd;
      carValueAt5 = inputs.estimatedMarketValueAtEnd;
      break;
    case "keep":
      runningAtLeaseEnd = -s.keepRunningOverLease;
      runningAt5 = -s.keepTotalSpentAt5;
      carValueAtLeaseEnd = s.currentCarValueAtLeaseEnd;
      carValueAt5 = inputs.currentCarMarketValueAtEnd;
      break;
  }

  const cashTotalAtLeaseEnd = extraCashFromSale + upfront + leaseOrLoanPayments + runningAtLeaseEnd + chargingDelta + residual;
  const cashTotalAt5 = extraCashFromSale + upfront + leaseOrLoanPayments + runningAt5 + chargingDelta + residual;

  const getIr = (pt: PathwayType) => (pt === "nl" ? s.irNl : pt === "cash" ? s.irCash : pt === "loan" ? s.irLoan : s.irKeep);
  const ir = getIr(pathwayType);

  return {
    extraCashFromSale,
    upfront,
    leaseOrLoanPayments,
    runningAtLeaseEnd,
    runningAt5,
    chargingDelta,
    residual,
    cashTotalAtLeaseEnd,
    cashTotalAt5,
    carValueAtLeaseEnd,
    carValueAt5,
    interestAtLeaseEnd: ir.first,
    interestAt5: ir.total,
  };
}

const MAX_PATHWAYS = 8;

export function ComparatorView({
  savedQuotes,
  defaultInputs,
  onNavigateToDetails,
}: {
  savedQuotes: SavedQuoteV1[];
  defaultInputs: Inputs;
  onNavigateToDetails?: (anchorId?: string) => void;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<SelectedKey>>(new Set());
  const [horizon, setHorizon] = useState<"five_year" | "lease_end">("five_year");

  const availablePathways = useMemo<AvailablePathway[]>(() => {
    return savedQuotes.flatMap((q) => {
      // resolveAutoFields recomputes residual/financed-amount/market-value/electricity/fuel
      // for THIS quote's own scenario if any were omitted from the saved quote (defaultInputs
      // here is sentinelDefaultInputs, so an omitted field reads as 0/"unset" first) — there's
      // no live auto-fill effect to do this for us here, unlike Advanced mode's own inputs.
      const inputs: Inputs = resolveAutoFields({ ...defaultInputs, ...(q.inputs as Partial<Inputs>) });
      const paths: AvailablePathway[] = [
        { key: `${q.id}__nl`, quoteId: q.id, quoteName: q.name, pathwayType: "nl", inputs },
        { key: `${q.id}__cash`, quoteId: q.id, quoteName: q.name, pathwayType: "cash", inputs },
      ];
      if (inputs.compareWithCarLoan) paths.push({ key: `${q.id}__loan`, quoteId: q.id, quoteName: q.name, pathwayType: "loan", inputs });
      if (inputs.compareWithCurrentCar) paths.push({ key: `${q.id}__keep`, quoteId: q.id, quoteName: q.name, pathwayType: "keep", inputs });
      return paths;
    });
  }, [savedQuotes, defaultInputs]);

  const selectedPathways = useMemo(() => availablePathways.filter((p) => selectedKeys.has(p.key)), [availablePathways, selectedKeys]);

  const rates = [...new Set(selectedPathways.map((p) => p.inputs.homeLoanOffsetInterestRate))];
  const ratesMismatch = rates.length > 1;

  const incomes = [...new Set(selectedPathways.map((p) => p.inputs.totalTaxableIncome))];
  const incomeMismatch = incomes.length > 1;

  const saleProceedsValues = [...new Set(selectedPathways.map((p) => (p.inputs.compareWithCurrentCar ? p.inputs.currentCarMarketValueNow ?? 0 : 0)))];
  const salesMismatch = saleProceedsValues.length > 1;

  const selectedKeepKey = selectedPathways.find((p) => p.pathwayType === "keep")?.key ?? null;

  const leaseDurations = [...new Set(selectedPathways.map((p) => Math.round(p.inputs.leaseDurationYears)))];
  const offerLeaseEndOption = leaseDurations.length === 1 && leaseDurations[0]! < 5;
  const effectiveHorizon = offerLeaseEndOption ? horizon : "five_year";
  const isLeaseEnd = effectiveHorizon === "lease_end";

  const canCompare = selectedPathways.length >= 2 && !ratesMismatch && !salesMismatch && !incomeMismatch;

  const columns = useMemo(() => {
    if (!canCompare) return [];
    return selectedPathways.map((p) => {
      const s = computeFinancialSummary({ inputs: p.inputs });
      const nums = extractPathwayNumbers(s, p.inputs, p.pathwayType);
      return { key: p.key, color: PATHWAY_COLORS[p.pathwayType], nums, pathwayType: p.pathwayType, quoteName: p.quoteName };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [selectedPathways, canCompare]);

  const toggle = (key: SelectedKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_PATHWAYS) next.add(key);
      return next;
    });
  };

  const columnsWithNet = columns.map((col) => {
    const cashTotal = isLeaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5;
    const carValue = isLeaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5;
    const interest = isLeaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5;
    return { ...col, netPosition: cashTotal + carValue + interest };
  });

  const winnerKey = columnsWithNet.length > 0 ? columnsWithNet.reduce((best, c) => (c.netPosition > best.netPosition ? c : best)).key : null;

  const rankedByKey: Record<string, (typeof columnsWithNet)[number] & { rank: number }> = {};
  [...columnsWithNet]
    .sort((a, b) => b.netPosition - a.netPosition)
    .forEach((col, idx) => {
      rankedByKey[col.key] = { ...col, rank: idx + 1 };
    });
  const ranked = columnsWithNet.map((c) => rankedByKey[c.key]!);

  // Section B row definitions (detailed cashflow/asset/liability breakdown) — matches v1's
  // cashFlowRows/assetRows/liabilityRows exactly (calculator/src/components/ComparatorView.tsx ~lines 405-454).
  const cashFlowRows: BreakdownRowDef[] = [
    { label: "Extra Cash From Sale of Old Car", getValue: (col) => col.nums.extraCashFromSale || null },
    { label: "Upfront Cost", getValue: (col) => col.nums.upfront || null },
    { label: "Lease / Loan Payments", getValue: (col) => col.nums.leaseOrLoanPayments || null },
    { label: "Running Cost", getValue: (col, leaseEnd) => (leaseEnd ? col.nums.runningAtLeaseEnd || null : col.nums.runningAt5 || null) },
    { label: "Charging Delta (EV only)", getValue: (col) => col.nums.chargingDelta || null },
    { label: "Residual Value Payable", getValue: (col) => col.nums.residual || null },
    { label: "= Total Cash Flow", getValue: (col, leaseEnd) => (leaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5), bold: true },
  ];
  const assetRows: BreakdownRowDef[] = [{ label: "Car Asset Value", getValue: (col, leaseEnd) => (leaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5) }];
  const liabilityRows: BreakdownRowDef[] = [
    { label: "Additional Home Loan Interest Accrued (cf. no car)", getValue: (col, leaseEnd) => (leaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5), bold: true },
  ];

  if (savedQuotes.length === 0) {
    return (
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--nlc-text-muted)" }}>
        Save at least two quotes (see "Saved quotes" above) to compare them side by side — e.g. a
        novated lease arrangement on a $60k EV vs a cash purchase of a $30k petrol car.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
      <div style={{ border: "1px solid var(--nlc-border)", borderRadius: "var(--nlc-radius-lg)", padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--nlc-purple)", marginBottom: 10 }}>
          Select pathways to compare ({selectedKeys.size}/{MAX_PATHWAYS})
        </div>
        {savedQuotes.map((q) => {
          const paths = availablePathways.filter((p) => p.quoteId === q.id);
          if (paths.length === 0) return null;
          return (
            <div key={q.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                {q.name}
                <span style={{ fontWeight: 500, fontSize: 11, color: "var(--nlc-text-muted)", marginLeft: 8 }}>
                  {paths[0]!.inputs.leaseDurationYears}yr lease · {paths[0]!.inputs.homeLoanOffsetInterestRate}% offset rate
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {paths.map((p) => {
                  const isChecked = selectedKeys.has(p.key);
                  const isDisabled = (!isChecked && selectedKeys.size >= MAX_PATHWAYS) || (p.pathwayType === "keep" && !isChecked && selectedKeepKey !== null);
                  const color = PATHWAY_COLORS[p.pathwayType];
                  return (
                    <label
                      key={p.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 999,
                        border: `1.5px solid ${isChecked ? color : "var(--nlc-border-mid)"}`,
                        background: isChecked ? `${color}18` : "transparent",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        color: isChecked ? color : isDisabled ? "var(--nlc-text-faint)" : "var(--nlc-text-soft)",
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <input type="checkbox" checked={isChecked} disabled={isDisabled} onChange={() => toggle(p.key)} style={{ margin: 0, accentColor: color }} />
                      {PATHWAY_LABELS[p.pathwayType]}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {ratesMismatch && selectedPathways.length >= 2 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--nlc-bad-light)", border: "1.5px solid rgba(220,38,38,0.3)", color: "var(--nlc-bad-dark)" }}>
          <b>Home loan offset rates differ — comparison blocked.</b> Selected pathways use rates: {rates.join("%, ")}%. Ensure all
          selected quotes were saved with the same offset rate.
        </div>
      )}

      {incomeMismatch && selectedPathways.length >= 2 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--nlc-bad-light)", border: "1.5px solid rgba(220,38,38,0.3)", color: "var(--nlc-bad-dark)" }}>
          <b>Taxable income differs — comparison blocked.</b> Selected pathways use incomes: {incomes.map((v) => fmtAud0(v)).join(", ")}. Ensure all
          selected quotes were saved with the same taxable income, since it drives the marginal tax rate used throughout.
        </div>
      )}

      {salesMismatch && selectedPathways.length >= 2 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--nlc-bad-light)", border: "1.5px solid rgba(220,38,38,0.3)", color: "var(--nlc-bad-dark)" }}>
          <b>Old car sale proceeds differ — comparison blocked.</b> This shifts the starting cashflow and makes the figures
          incomparable across quotes.
        </div>
      )}

      {selectedPathways.length === 1 && !ratesMismatch && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--nlc-bg-sunken)", color: "var(--nlc-text-muted)" }}>
          Select at least one more pathway to see the comparison.
        </div>
      )}

      {canCompare && (
        <>
          {offerLeaseEndOption && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--nlc-text-muted)", fontWeight: 600 }}>Horizon</span>
              <div className="nlc-pill-group">
                <button type="button" className="nlc-pill-group__btn" aria-pressed={effectiveHorizon === "five_year"} onClick={() => setHorizon("five_year")}>
                  @ 5y
                </button>
                <button type="button" className="nlc-pill-group__btn" aria-pressed={effectiveHorizon === "lease_end"} onClick={() => setHorizon("lease_end")}>
                  @ {leaseDurations[0]}y
                </button>
              </div>
            </div>
          )}

          <Table>
            <thead>
              <tr>
                <th style={th()}>Metric</th>
                {ranked.map((col) => (
                  <th key={col.key} style={{ ...thR(), background: col.color, color: "#fff" }}>
                    {col.key === winnerKey && <div style={{ fontSize: 9, letterSpacing: "0.05em" }}>★ BEST</div>}
                    {col.pathwayType !== "keep" && <div style={{ fontWeight: 900 }}>{col.quoteName}</div>}
                    <div style={{ fontWeight: 600, opacity: 0.85 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Net Cash Flow", getValue: (c: (typeof ranked)[number]) => (isLeaseEnd ? c.nums.cashTotalAtLeaseEnd : c.nums.cashTotalAt5) },
                { label: "Car Value at End", getValue: (c: (typeof ranked)[number]) => (isLeaseEnd ? c.nums.carValueAtLeaseEnd : c.nums.carValueAt5) },
                { label: "Home Loan Interest", getValue: (c: (typeof ranked)[number]) => (isLeaseEnd ? c.nums.interestAtLeaseEnd : c.nums.interestAt5) },
                { label: "Net Financial Position", getValue: (c: (typeof ranked)[number]) => c.netPosition, bold: true },
              ].map((row) => (
                <tr key={row.label}>
                  <td style={td({ fontWeight: row.bold ? 800 : 500 })}>{row.label}</td>
                  {ranked.map((col) => {
                    const v = row.getValue(col);
                    const isBest = row.label === "Net Financial Position" && col.key === winnerKey;
                    return (
                      <td key={col.key} style={tdR({ fontWeight: row.bold ? 800 : 500, color: isBest ? col.color : undefined })}>
                        {v < 0 ? `(${fmtAud0(v)})` : fmtAud0(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Section B: detailed cashflow/asset/liability breakdown — shows where the money
              actually goes per pathway, honouring the same horizon toggle as the ranking table
              above. Matches v1's rendering: when the lease-end horizon is selected, BOTH the
              lease-end table and the always-shown @5y table render (the 5y table is the
              eventual full-term view, shown regardless of the toggle). */}
          {offerLeaseEndOption && isLeaseEnd && (
            <DetailedBreakdownTable
              headerLabel={`@ ${leaseDurations[0]}y`}
              leaseEnd
              ranked={ranked}
              cashFlowRows={cashFlowRows}
              assetRows={assetRows}
              liabilityRows={liabilityRows}
            />
          )}
          <DetailedBreakdownTable
            headerLabel="@ 5y"
            leaseEnd={false}
            ranked={ranked}
            cashFlowRows={cashFlowRows}
            assetRows={assetRows}
            liabilityRows={liabilityRows}
          />

          {onNavigateToDetails &&
            (() => {
              const anyNl = selectedPathways.some((p) => p.pathwayType === "nl");
              const anySgRisk = selectedPathways.some((p) => p.pathwayType === "nl" && p.inputs.superFromPreNlIncome === "No");
              if (!anyNl && !anySgRisk) return null;
              const linkStyle: React.CSSProperties = { color: "#0b5cab", textDecoration: "underline", cursor: "pointer" };
              return (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.025)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "rgba(0,0,0,0.70)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {anyNl && (
                    <div>
                      ⚠️{" "}
                      <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToDetails("details-section-4-ati"); }} style={linkStyle}>
                        Adjusted Taxable Income effects are not captured here
                      </a>{" "}
                      — novated leasing affects ATI, which can impact HECS/HELP repayments, childcare subsidy, Medicare levy
                      surcharge, child support assessments, and Division 293 tax. Load each NL quote individually and check{" "}
                      <b>Section 4 in the Details tab</b> for a full evaluation.
                    </div>
                  )}
                  {anySgRisk && (
                    <div>
                      ⚠️{" "}
                      <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToDetails("details-section-5-sg"); }} style={linkStyle}>
                        Super Guarantee may be materially reduced
                      </a>{" "}
                      — one or more NL pathways in this comparison have SG calculated on post-NL income, which can mean a
                      significant shortfall in super contributions. Load the relevant quote and check <b>Section 5 in the Details tab</b>.
                    </div>
                  )}
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
