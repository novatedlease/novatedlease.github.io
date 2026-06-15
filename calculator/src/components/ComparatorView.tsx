import { useMemo, useState } from "react";
import type { Inputs } from "../engine/types";
import { computeFinancialSummary } from "./FinancialReport";

// ─── Types ────────────────────────────────────────────────────────────────────

type PathwayType = "nl" | "cash" | "loan" | "keep";

const PATHWAY_COLORS: Record<PathwayType, string> = {
  nl: "#0b5cab",
  cash: "#1b5e20",
  loan: "#4527a0",
  keep: "#00695c",
};

const PATHWAY_LABELS: Record<PathwayType, string> = {
  nl: "Novated Lease",
  cash: "Offset Cash",
  loan: "Car Loan",
  keep: "Keep Old Car",
};

export type SavedQuoteMini = {
  id: string;
  name: string;
  inputs: Partial<Inputs>;
};

type SelectedKey = string; // `${quoteId}__${pathwayType}`

type AvailablePathway = {
  key: SelectedKey;
  quoteId: string;
  quoteName: string;
  pathwayType: PathwayType;
  inputs: Inputs;
};

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
  leaseDurationYears: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money2(n: number): string {
  if (Math.abs(n) < 0.005) return "$ -";
  const fmt = Math.abs(n).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `$ (${fmt})` : `$ ${fmt}`;
}

function fmtAud0(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

function extractPathwayNumbers(
  s: ReturnType<typeof computeFinancialSummary>,
  inputs: Inputs,
  pathwayType: PathwayType
): PathwayNumbers {
  const extraCashFromSale = pathwayType === "keep" ? 0 : s.extraCashFromSaleOfOldCar;
  const postLeaseRunning = s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd;
  const loanRunningAtLeaseEnd =
    s.loanTotalSpentAtLeaseEnd - inputs.carLoanInitialDeposit - s.loanPaymentTotalInclFees;
  const loanRunningAt5 =
    s.loanTotalSpentAt5 - inputs.carLoanInitialDeposit - s.loanPaymentTotalInclFees;
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
      runningAtLeaseEnd = 0;
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

  const cashTotalAtLeaseEnd =
    extraCashFromSale + upfront + leaseOrLoanPayments + runningAtLeaseEnd + chargingDelta + residual;
  const cashTotalAt5 =
    extraCashFromSale + upfront + leaseOrLoanPayments + runningAt5 + chargingDelta + residual;

  const getIr = (pt: PathwayType) =>
    pt === "nl" ? s.irNl : pt === "cash" ? s.irCash : pt === "loan" ? s.irLoan : s.irKeep;
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
    leaseDurationYears: s.yearsLease,
  };
}

// ─── Local types used in main export ─────────────────────────────────────────

type ComparatorColumn = {
  key: SelectedKey;
  label: string;
  color: string;
  nums: PathwayNumbers;
  pathwayType: PathwayType;
  inputs: Inputs;
  quoteName: string;
};

type TableRowDef = {
  label: string;
  getValue: (col: ComparatorColumn, isLeaseEnd: boolean) => number | null;
  bold?: boolean;
};

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ComparatorView({
  savedQuotes,
  defaultInputs,
}: {
  savedQuotes: SavedQuoteMini[];
  defaultInputs: Inputs;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<SelectedKey>>(new Set());
  const [horizon, setHorizon] = useState<"five_year" | "lease_end">("five_year");
  const [selectionOpen, setSelectionOpen] = useState(true);

  // Build available pathways per quote
  const availablePathways = useMemo<AvailablePathway[]>(() => {
    return savedQuotes.flatMap((q) => {
      const inputs: Inputs = { ...defaultInputs, ...(q.inputs as Partial<Inputs>) };
      const paths: AvailablePathway[] = [];
      paths.push({ key: `${q.id}__nl`, quoteId: q.id, quoteName: q.name, pathwayType: "nl", inputs });
      paths.push({ key: `${q.id}__cash`, quoteId: q.id, quoteName: q.name, pathwayType: "cash", inputs });
      if (inputs.compareWithCarLoan) {
        paths.push({ key: `${q.id}__loan`, quoteId: q.id, quoteName: q.name, pathwayType: "loan", inputs });
      }
      if (inputs.compareWithCurrentCar) {
        paths.push({ key: `${q.id}__keep`, quoteId: q.id, quoteName: q.name, pathwayType: "keep", inputs });
      }
      return paths;
    });
  }, [savedQuotes, defaultInputs]);

  const selectedPathways = useMemo(
    () => availablePathways.filter((p) => selectedKeys.has(p.key)),
    [availablePathways, selectedKeys]
  );

  // Validation: home loan rates must match
  const rates = [...new Set(selectedPathways.map((p) => p.inputs.homeLoanOffsetInterestRate))];
  const ratesMismatch = rates.length > 1;

  // Horizon logic
  const leaseDurations = [
    ...new Set(selectedPathways.map((p) => Math.round(p.inputs.leaseDurationYears))),
  ];
  const offerLeaseEndOption = leaseDurations.length === 1 && leaseDurations[0] < 5;
  const effectiveHorizon = offerLeaseEndOption ? horizon : "five_year";
  const isLeaseEnd = effectiveHorizon === "lease_end";
  const horizonYears = isLeaseEnd ? (leaseDurations[0] ?? 5) : 5;

  const canCompare = selectedPathways.length >= 2 && !ratesMismatch;

  // Compute columns
  const columns = useMemo<ComparatorColumn[]>(() => {
    if (!canCompare) return [];
    return selectedPathways.map((p) => {
      const s = computeFinancialSummary({ inputs: p.inputs, taxRateInclMedicarePct: 47 });
      const nums = extractPathwayNumbers(s, p.inputs, p.pathwayType);
      return {
        key: p.key,
        label: `${p.quoteName} · ${PATHWAY_LABELS[p.pathwayType]}`,
        color: PATHWAY_COLORS[p.pathwayType],
        nums,
        pathwayType: p.pathwayType,
        inputs: p.inputs,
        quoteName: p.quoteName,
      };
    });
  }, [selectedPathways, canCompare]);

  const toggle = (key: SelectedKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Render: no saved quotes ───────────────────────────────────────────────

  if (savedQuotes.length === 0) {
    return (
      <div
        style={{
          padding: "24px 20px",
          borderRadius: 14,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 18px rgba(0,0,0,0.07)",
          textAlign: "center",
          color: "rgba(0,0,0,0.65)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>No saved quotes yet</div>
        <div>
          Use <b>💾 Save / load quotes</b> to save your current calculation, then come back here to
          compare saved scenarios side-by-side.
        </div>
      </div>
    );
  }

  // ── Table row definitions ─────────────────────────────────────────────────

  const cashFlowRows: TableRowDef[] = [
    {
      label: "Extra Cash From Sale of Old Car",
      getValue: (col, _) => col.nums.extraCashFromSale || null,
    },
    {
      label: "Upfront Cost",
      getValue: (col, _) => col.nums.upfront || null,
    },
    {
      label: "Lease / Loan Payments",
      getValue: (col, _) => col.nums.leaseOrLoanPayments || null,
    },
    {
      label: "Running Cost",
      getValue: (col, leaseEnd) =>
        leaseEnd ? col.nums.runningAtLeaseEnd || null : col.nums.runningAt5 || null,
    },
    {
      label: "Charging Delta (EV only)",
      getValue: (col, _) => col.nums.chargingDelta || null,
    },
    {
      label: "Residual Value Payable",
      getValue: (col, _) => col.nums.residual || null,
    },
    {
      label: "= Total Cash Flow",
      getValue: (col, leaseEnd) =>
        leaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5,
      bold: true,
    },
  ];

  const assetRows: TableRowDef[] = [
    {
      label: "Car Asset Value",
      getValue: (col, leaseEnd) =>
        leaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5,
    },
  ];

  const liabilityRows: TableRowDef[] = [
    {
      label: "Additional Home Loan Interest Accrued (cf. no car)",
      getValue: (col, leaseEnd) =>
        leaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5,
      bold: true,
    },
  ];

  // ── Net position for ranking ──────────────────────────────────────────────

  type RankedColumn = ComparatorColumn & { netPosition: number; rank: number };

  const ranked: RankedColumn[] = columns
    .map((col) => {
      const cashTotal = isLeaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5;
      const carValue = isLeaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5;
      const interest = isLeaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5;
      const netPosition = cashTotal + carValue - interest;
      return { ...col, netPosition };
    })
    .sort((a, b) => b.netPosition - a.netPosition)
    .map((col, idx) => ({ ...col, rank: idx + 1 }));

  const rankedByKey: Record<string, RankedColumn> = {};
  ranked.forEach((r) => {
    rankedByKey[r.key] = r;
  });

  // Keep original column order for the table
  const columnsInOriginalOrder = columns.map((c) => ({ ...c, ...rankedByKey[c.key] }));

  const horizonLabel = isLeaseEnd
    ? `@ ${horizonYears} years (end of lease)`
    : "@ 5 years";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Selection panel ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 18px rgba(0,0,0,0.07)",
          borderLeft: "4px solid #7b1fa2",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectionOpen((p) => !p)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 16px",
            background: "rgba(123,31,162,0.05)",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13.5,
                color: "#7b1fa2",
                marginBottom: 2,
                letterSpacing: "-0.01em",
              }}
            >
              🔀 Select pathways to compare
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.65 }}>
              {selectedKeys.size === 0
                ? "Choose at least 2 pathways from your saved quotes"
                : `${selectedKeys.size} pathway${selectedKeys.size === 1 ? "" : "s"} selected${canCompare ? " — comparison ready" : ""}`}
            </div>
          </div>
          <div
            aria-hidden
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "rgba(123,31,162,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#7b1fa2",
              flex: "0 0 auto",
              transition: "transform 180ms ease",
              transform: selectionOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </div>
        </button>

        {selectionOpen && (
          <div style={{ padding: 16 }}>
            {/* Group by quote */}
            {savedQuotes.map((q) => {
              const paths = availablePathways.filter((p) => p.quoteId === q.id);
              if (paths.length === 0) return null;
              return (
                <div
                  key={q.id}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "rgba(0,0,0,0.01)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13.5,
                      marginBottom: 8,
                      color: "rgba(0,0,0,0.85)",
                    }}
                  >
                    {q.name}
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: 11.5,
                        color: "rgba(0,0,0,0.45)",
                        marginLeft: 8,
                      }}
                    >
                      {(paths[0].inputs.leaseDurationYears ?? 5)}yr lease ·{" "}
                      {paths[0].inputs.homeLoanOffsetInterestRate ?? "?"}% offset rate
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {paths.map((p) => {
                      const isChecked = selectedKeys.has(p.key);
                      const color = PATHWAY_COLORS[p.pathwayType];
                      return (
                        <label
                          key={p.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: `1.5px solid ${isChecked ? color : "rgba(0,0,0,0.18)"}`,
                            background: isChecked ? `${color}18` : "rgba(0,0,0,0.02)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            color: isChecked ? color : "rgba(0,0,0,0.65)",
                            userSelect: "none",
                            transition: "all 120ms ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(p.key)}
                            style={{ margin: 0, accentColor: color, width: 14, height: 14 }}
                          />
                          {PATHWAY_LABELS[p.pathwayType]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 4, fontSize: 11.5, color: "rgba(0,0,0,0.5)", lineHeight: 1.4 }}>
              NL and Offset Cash are always available. Car Loan and Keep Old Car only appear if they
              were enabled when the quote was saved.
            </div>
          </div>
        )}
      </div>

      {/* ── Validation feedback ── */}
      {ratesMismatch && selectedPathways.length >= 2 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(183,28,28,0.07)",
            border: "1.5px solid rgba(183,28,28,0.30)",
            color: "#b71c1c",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            ⛔ Home loan offset rates differ — comparison blocked
          </div>
          <div>
            The selected pathways use different home loan offset interest rates:{" "}
            {rates.map((r) => `${r}%`).join(", ")}. The liability (home loan interest accrual)
            calculation depends on this rate — comparing scenarios with different rates would
            produce numbers on different scales and give misleading results.
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Fix: ensure all selected quotes were saved with the same offset interest rate.
          </div>
        </div>
      )}

      {!ratesMismatch && selectedPathways.length === 1 && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 13,
            color: "rgba(0,0,0,0.60)",
          }}
        >
          Select at least one more pathway to see the comparison.
        </div>
      )}

      {/* ── Horizon selector ── */}
      {canCompare && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>Horizon</div>
          {!offerLeaseEndOption ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 30,
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "rgba(0,0,0,0.04)",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                userSelect: "none",
              }}
              title={
                leaseDurations.length > 1
                  ? "Mixed lease lengths — standardised to 5-year horizon"
                  : "5-year lease — lease-end equals 5-year horizon"
              }
            >
              @ 5y
              {leaseDurations.length > 1 && (
                <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 6, opacity: 0.7 }}>
                  (mixed lengths, forced)
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                height: 30,
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "rgba(0,0,0,0.04)",
                overflow: "hidden",
                userSelect: "none",
                minWidth: 148,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: 2,
                  width: "calc(50% - 2px)",
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  transform:
                    effectiveHorizon === "five_year" ? "translateX(0)" : "translateX(100%)",
                  transition: "transform 180ms ease",
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  height: "100%",
                }}
              >
                <button
                  type="button"
                  onClick={() => setHorizon("five_year")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: effectiveHorizon === "five_year" ? 800 : 600,
                    opacity: effectiveHorizon === "five_year" ? 1 : 0.75,
                  }}
                >
                  @ 5y
                </button>
                <button
                  type="button"
                  onClick={() => setHorizon("lease_end")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: effectiveHorizon === "lease_end" ? 800 : 600,
                    opacity: effectiveHorizon === "lease_end" ? 1 : 0.75,
                  }}
                >
                  @ {leaseDurations[0]}y
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Comparison output ── */}
      {canCompare && (
        <>
          {/* ── SECTION A: Summary ranking ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 18px rgba(0,0,0,0.07)",
              borderLeft: "4px solid #7b1fa2",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(123,31,162,0.05)",
                borderBottom: "1px solid rgba(123,31,162,0.12)",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#7b1fa2",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Summary Comparison — {horizonLabel}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                Net Position = Cash Flow + Car Value − Home Loan Interest. Higher is better.
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "max-content",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "7px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#4a4a4a",
                        color: "#fff",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Metric
                    </th>
                    {ranked.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: "right",
                          padding: "7px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          background: col.color,
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.rank === 1 && (
                          <div style={{ fontSize: 9, letterSpacing: "0.05em", marginBottom: 1 }}>
                            ★ BEST
                          </div>
                        )}
                        <div style={{ fontWeight: 900 }}>{col.quoteName}</div>
                        <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 1 }}>
                          {PATHWAY_LABELS[col.pathwayType]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Net Cash Flow",
                      getValue: (col: RankedColumn) =>
                        isLeaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5,
                      note: "negative = money out",
                    },
                    {
                      label: "Car Value at End",
                      getValue: (col: RankedColumn) =>
                        isLeaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5,
                      note: "",
                    },
                    {
                      label: "Home Loan Interest",
                      getValue: (col: RankedColumn) =>
                        isLeaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5,
                      note: "vs no-car baseline",
                    },
                    {
                      label: "Net Financial Position",
                      getValue: (col: RankedColumn) => col.netPosition,
                      note: "higher = better",
                      bold: true,
                    },
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid rgba(0,0,0,0.07)",
                          fontWeight: (row as any).bold ? 800 : 500,
                        }}
                      >
                        {row.label}
                        {row.note && (
                          <span
                            style={{ fontSize: 11, opacity: 0.55, marginLeft: 6, fontStyle: "italic" }}
                          >
                            ({row.note})
                          </span>
                        )}
                      </td>
                      {ranked.map((col) => {
                        const v = row.getValue(col);
                        const isNetRow = row.label === "Net Financial Position";
                        const isInterestRow = row.label === "Home Loan Interest";
                        const isBest = isNetRow && col.rank === 1;
                        return (
                          <td
                            key={col.key}
                            style={{
                              textAlign: "right",
                              padding: "8px 12px",
                              borderBottom: "1px solid rgba(0,0,0,0.07)",
                              fontWeight: (row as any).bold ? 800 : 500,
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                              background: isBest ? `${col.color}10` : undefined,
                              color: isInterestRow
                                ? "rgba(180,0,0,0.85)"
                                : isNetRow
                                ? v >= 0
                                  ? "rgb(27, 94, 32)"
                                  : "rgb(180, 0, 0)"
                                : undefined,
                            }}
                          >
                            {isInterestRow || (row.label === "Net Cash Flow" && v < 0)
                              ? `(${fmtAud0(Math.abs(v))})`
                              : fmtAud0(Math.abs(v))}
                            {isNetRow && v >= 0 ? " ↑" : isNetRow ? " ↓" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "8px 14px",
                fontSize: 11.5,
                opacity: 0.6,
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              Home loan interest figures are relative to a no-car baseline (same rate enforced
              across all scenarios). Net Position = Cash Flow + Car Value − Interest.
            </div>
          </div>

          {/* ── SECTION B: Section 2-style detailed table ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 18px rgba(0,0,0,0.07)",
              borderLeft: "4px solid #1b5e20",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(27,94,32,0.05)",
                borderBottom: "1px solid rgba(27,94,32,0.12)",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#1b5e20",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Detailed Financial Breakdown
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                Mirrors Section 2 — cashflow, asset, and liability rows for each selected pathway.
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* Lease-end table (only if applicable) */}
              {offerLeaseEndOption && isLeaseEnd && (
                <>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 12,
                      color: "#0b5cab",
                      letterSpacing: "0.03em",
                      marginBottom: 6,
                    }}
                  >
                    @ {leaseDurations[0]} Years (End of Lease)
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                    <table
                      style={{
                        width: "100%",
                        minWidth: "max-content",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" as const, background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>
                            @ {leaseDurations[0]}y
                          </th>
                          {columnsInOriginalOrder.map((col) => (
                            <th key={col.key} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, background: col.color, color: "#fff", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 900 }}>{col.quoteName}</div>
                              <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Cash Flow
                          </td>
                        </tr>
                        {cashFlowRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, maxWidth: 300 }}>{row.label}</td>
                            {columnsInOriginalOrder.map((col) => {
                              const v = row.getValue(col, true);
                              return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Asset
                          </td>
                        </tr>
                        {assetRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                            {columnsInOriginalOrder.map((col) => {
                              const v = row.getValue(col, true);
                              return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Liability
                          </td>
                        </tr>
                        {liabilityRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                            {columnsInOriginalOrder.map((col) => {
                              const v = row.getValue(col, true);
                              return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* 5-year table */}
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 12,
                  color: "#0b5cab",
                  letterSpacing: "0.03em",
                  marginBottom: 6,
                }}
              >
                @ 5 Years
              </div>
              <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: "max-content",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" as const, background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>
                        @ 5y
                      </th>
                      {columnsInOriginalOrder.map((col) => (
                        <th key={col.key} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, background: col.color, color: "#fff", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 900 }}>{col.quoteName}</div>
                          <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Cash Flow
                      </td>
                    </tr>
                    {cashFlowRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, maxWidth: 300 }}>{row.label}</td>
                        {columnsInOriginalOrder.map((col) => {
                          const v = row.getValue(col, false);
                          return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Asset
                      </td>
                    </tr>
                    {assetRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                        {columnsInOriginalOrder.map((col) => {
                          const v = row.getValue(col, false);
                          return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={1 + columnsInOriginalOrder.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Liability
                      </td>
                    </tr>
                    {liabilityRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                        {columnsInOriginalOrder.map((col) => {
                          const v = row.getValue(col, false);
                          return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  opacity: 0.6,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                }}
              >
                Running costs include service/maintenance, registration, fuel/electricity, and
                insurance. NL running costs during the lease are packaged pre-tax (shown in Section
                1 of each individual quote). Home loan interest is relative to the no-car baseline.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
