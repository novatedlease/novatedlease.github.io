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

// ─── How-to panel (shown when there are no saved quotes, or nothing selected) ─

function ComparatorHowTo() {
  const PURPLE = "#7b1fa2";
  const stepStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  };
  const numStyle: React.CSSProperties = {
    flex: "0 0 24px",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: PURPLE,
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: PURPLE, marginBottom: 4 }}>
          🔀 Compare any two scenarios side-by-side
        </div>
        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.60)", lineHeight: 1.5 }}>
          Mix and match different vehicles, purchase methods, and lease lengths — the comparator
          puts them all on the same footing.
        </div>
      </div>

      {/* Example questions */}
      <div
        style={{
          background: "rgba(123,31,162,0.06)",
          border: "1px solid rgba(123,31,162,0.18)",
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
          color: "rgba(0,0,0,0.70)",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, color: PURPLE }}>Example questions you can answer here:</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Is a <b>novated lease on a $50k EV</b> cheaper than a <b>cash purchase of a $30k petrol car</b>?</li>
          <li>Is a <b>car loan on a $20k petrol car</b> better than a <b>2-year novated lease on a $40k EV</b>?</li>
          <li>Is <b>outright purchase of a $30k EV</b> better than a <b>1-year novated lease on a $50k EV</b>?</li>
        </ul>
      </div>

      {/* Steps */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "rgba(0,0,0,0.75)" }}>
          How to set up a comparison:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
          <div style={stepStyle}>
            <div style={numStyle}>1</div>
            <div>
              Fill in the calculator for your <b>first scenario</b> (e.g., the EV on a novated
              lease). Then click <b>💾 Save / load quotes</b> and save it with a descriptive name.
            </div>
          </div>
          <div style={stepStyle}>
            <div style={numStyle}>2</div>
            <div>
              Adjust the inputs for your <b>second scenario</b> (e.g., change the vehicle to the
              ICE car and update running costs). If you only want to compare the{" "}
              <b>Offset Cash pathway</b>, you can safely skip the "Vehicle lease detail" box — just
              make sure the vehicle cost and running costs are correct.
            </div>
          </div>
          <div style={stepStyle}>
            <div style={numStyle}>3</div>
            <div>
              Save the second quote. Repeat for any additional scenarios you want to compare.
            </div>
          </div>
          <div style={stepStyle}>
            <div style={numStyle}>4</div>
            <div>
              Return to this <b>Compare tab</b> and tick at least two pathways from your saved
              quotes. The side-by-side breakdown will appear automatically.
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.50)", lineHeight: 1.5, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
        <b>Tips:</b> All selected pathways must use the same home loan offset interest rate (it's
        used as the opportunity cost baseline). Car Loan and Keep Old Car pathways only appear if
        those options were enabled when a quote was saved.
      </div>
    </div>
  );
}

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

  // Validation: old-car sale proceeds must be the same across all selected pathways
  // (extraCashFromSaleOfOldCar = compareWithCurrentCar ? currentCarMarketValueNow : 0)
  const saleProceedsValues = [
    ...new Set(
      selectedPathways.map((p) =>
        p.inputs.compareWithCurrentCar ? (p.inputs.currentCarMarketValueNow ?? 0) : 0
      )
    ),
  ];
  const salesMismatch = saleProceedsValues.length > 1;

  // Keep Old Car: only one allowed at a time (it's the same real-world baseline)
  const selectedKeepKey = selectedPathways.find((p) => p.pathwayType === "keep")?.key ?? null;

  // Validate: if multiple keep pathways exist across available paths, their car details must match
  const KEEP_DETAIL_FIELDS: (keyof Inputs)[] = [
    "currentCarMarketValueNow", "currentCarMarketValueAtEnd",
    "currentServiceMaintTyresAnnual", "currentRegistrationAnnual",
    "currentFuelAnnual", "currentInsuranceAnnual",
  ];
  const allKeepPathways = availablePathways.filter((p) => p.pathwayType === "keep");
  const keepDetailsMismatch =
    allKeepPathways.length > 1 &&
    KEEP_DETAIL_FIELDS.some(
      (field) => new Set(allKeepPathways.map((p) => p.inputs[field])).size > 1
    );

  // Horizon logic
  const leaseDurations = [
    ...new Set(selectedPathways.map((p) => Math.round(p.inputs.leaseDurationYears))),
  ];
  const offerLeaseEndOption = leaseDurations.length === 1 && leaseDurations[0] < 5;
  const effectiveHorizon = offerLeaseEndOption ? horizon : "five_year";
  const isLeaseEnd = effectiveHorizon === "lease_end";
  const horizonYears = isLeaseEnd ? (leaseDurations[0] ?? 5) : 5;

  const canCompare = selectedPathways.length >= 2 && !ratesMismatch && !salesMismatch;

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

  const MAX_PATHWAYS = 8;

  const toggle = (key: SelectedKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_PATHWAYS) next.add(key);
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
          fontSize: 14,
          lineHeight: 1.6,
          color: "rgba(0,0,0,0.70)",
        }}
      >
        <ComparatorHowTo />
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

  // Attach net position to each column (logical order preserved)
  type RankedColumn = ComparatorColumn & { netPosition: number; rank: number };

  const columnsWithNet: (ComparatorColumn & { netPosition: number })[] = columns.map((col) => {
    const cashTotal = isLeaseEnd ? col.nums.cashTotalAtLeaseEnd : col.nums.cashTotalAt5;
    const carValue = isLeaseEnd ? col.nums.carValueAtLeaseEnd : col.nums.carValueAt5;
    const interest = isLeaseEnd ? col.nums.interestAtLeaseEnd : col.nums.interestAt5;
    return { ...col, netPosition: cashTotal + carValue + interest };
  });

  // Determine winner key (highest net position = least money out / most asset)
  const winnerKey =
    columnsWithNet.length > 0
      ? columnsWithNet.reduce((best, c) => (c.netPosition > best.netPosition ? c : best)).key
      : null;

  // rankedByKey kept for rank badge lookups (rank 1 = best)
  const rankedByKey: Record<string, RankedColumn> = {};
  [...columnsWithNet]
    .sort((a, b) => b.netPosition - a.netPosition)
    .forEach((col, idx) => {
      rankedByKey[col.key] = { ...col, rank: idx + 1 };
    });

  // Display order: logical (quote order, then NL → Cash → Loan → Keep within each quote)
  const ranked = columnsWithNet.map((c) => rankedByKey[c.key]);


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
                : selectedKeys.size >= MAX_PATHWAYS
                ? `${selectedKeys.size} pathways selected (maximum reached)`
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
                      const isDisabled =
                        (!isChecked && selectedKeys.size >= MAX_PATHWAYS) ||
                        (p.pathwayType === "keep" && !isChecked && selectedKeepKey !== null);
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
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            color: isChecked ? color : isDisabled ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.65)",
                            userSelect: "none",
                            transition: "all 120ms ease",
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => toggle(p.key)}
                            style={{ margin: 0, accentColor: color, width: 14, height: 14, cursor: isDisabled ? "not-allowed" : "pointer" }}
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
              were enabled when the quote was saved. Only one Keep Old Car pathway can be selected
              at a time.
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

      {salesMismatch && selectedPathways.length >= 2 && (
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
            ⛔ Old car sale proceeds differ — comparison blocked
          </div>
          <div>
            Some selected quotes include proceeds from selling an existing car (
            {saleProceedsValues.map((v) => `$${Math.round(v).toLocaleString("en-AU")}`).join(", ")}
            ) while others don't. This shifts the starting cashflow and makes the figures
            incomparable — it's like comparing one scenario where you pocket $20k from selling
            your car against another where you don't.
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Fix: ensure all selected quotes have "Compare with keeping current car" turned on,
            with the same current car information filled in — or all have it turned off.
          </div>
        </div>
      )}

      {keepDetailsMismatch && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(230,81,0,0.07)",
            border: "1.5px solid rgba(230,81,0,0.30)",
            color: "#e65100",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            ⚠️ Keep Old Car pathways have different details across your quotes
          </div>
          <div>
            Multiple quotes have "Keep Old Car" enabled but with different current car information
            (e.g. different market value, running costs, or insurance). These represent different
            cars, so only one Keep Old Car pathway can be selected at a time. Make sure your
            current car details are consistent across quotes if you intend to compare them against
            the same kept car.
          </div>
        </div>
      )}

      {selectedKeys.size === 0 && (
        <div
          style={{
            padding: "20px 18px",
            borderRadius: 12,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <ComparatorHowTo />
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

      {/* ── Mixed-duration notice ── */}
      {canCompare && leaseDurations.length > 1 && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.10)",
            fontSize: 12.5,
            color: "rgba(0,0,0,0.55)",
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "rgba(0,0,0,0.65)" }}>Why 5 years?</b> The selected pathways have
          different lease lengths ({leaseDurations.sort((a, b) => a - b).map((d) => `${d}yr`).join(", ")}
          ). Comparing them at their individual lease-end dates would be
          apples-to-oranges — a 3-year lease finishes while a 5-year lease still has 2 years of
          payments left. Standardising to a common 5-year horizon puts every pathway on the same
          footing, with post-lease running costs estimated for the shorter-term ones.
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
                All values signed: costs in ( ), assets positive.
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
                        {col.key === winnerKey && (
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
                      note: "",
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
                        const isBest = isNetRow && col.key === winnerKey;
                        const colRank = rankedByKey[col.key]?.rank ?? 0;
                        const display = v < 0 ? `(${fmtAud0(Math.abs(v))})` : fmtAud0(v);
                        const rankLabel = colRank === 1 ? "★ Best" : colRank === 2 ? "2nd" : colRank === 3 ? "3rd" : `${colRank}th`;
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
                                ? isBest
                                  ? col.color
                                  : "rgba(0,0,0,0.65)"
                                : undefined,
                            }}
                          >
                            {isNetRow ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.04em",
                                    color: isBest ? col.color : "rgba(0,0,0,0.38)",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {rankLabel}
                                </span>
                                <span>{display}</span>
                              </div>
                            ) : display}
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
              across all scenarios). All three rows are signed — add them directly to get Net Position.
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
                          {ranked.map((col) => (
                            <th key={col.key} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, background: col.color, color: "#fff", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 900 }}>{col.quoteName}</div>
                              <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Cash Flow
                          </td>
                        </tr>
                        {cashFlowRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, maxWidth: 300 }}>{row.label}</td>
                            {ranked.map((col) => {
                              const v = row.getValue(col, true);
                              return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Asset
                          </td>
                        </tr>
                        {assetRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                            {ranked.map((col) => {
                              const v = row.getValue(col, true);
                              return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                            Liability
                          </td>
                        </tr>
                        {liabilityRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                            {ranked.map((col) => {
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
                      {ranked.map((col) => (
                        <th key={col.key} style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, background: col.color, color: "#fff", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 900 }}>{col.quoteName}</div>
                          <div style={{ fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{PATHWAY_LABELS[col.pathwayType]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Cash Flow
                      </td>
                    </tr>
                    {cashFlowRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, maxWidth: 300 }}>{row.label}</td>
                        {ranked.map((col) => {
                          const v = row.getValue(col, false);
                          return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Asset
                      </td>
                    </tr>
                    {assetRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                        {ranked.map((col) => {
                          const v = row.getValue(col, false);
                          return <td key={col.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v === null || v === undefined ? "$ -" : money2(v)}</td>;
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={1 + ranked.length} style={{ padding: "9px 10px 7px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: "rgba(11,92,171,0.07)", color: "#0b5cab", borderTop: "2px solid rgba(11,92,171,0.15)", borderBottom: "1px solid rgba(11,92,171,0.12)" }}>
                        Liability
                      </td>
                    </tr>
                    {liabilityRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: row.bold ? 800 : 500 }}>{row.label}</td>
                        {ranked.map((col) => {
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

          {/* ── Caveats / disclaimers ── */}
          {(() => {
            const anyNl = selectedPathways.some((p) => p.pathwayType === "nl");
            const anySgRisk = selectedPathways.some(
              (p) => p.pathwayType === "nl" && p.inputs.superFromPreNlIncome === "No"
            );
            const BLUE = "rgba(11, 92, 171, 1)";
            const navigateToSection = (anchorId: string) =>
              window.dispatchEvent(
                new CustomEvent("nlguide:navigate", { detail: { tab: "Details", anchorId } })
              );
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
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); navigateToSection("details-section-4-ati"); }}
                      style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}
                    >
                      Adjusted Taxable Income effects are not captured here
                    </a>{" "}
                    — novated leasing affects ATI, which can impact HECS/HELP repayments, childcare
                    subsidy, Medicare levy surcharge, child support assessments, and Division 293
                    tax. Load each NL quote individually and check{" "}
                    <b>Section 4 in the Details tab</b> for a full evaluation.
                  </div>
                )}
                {anySgRisk && (
                  <div>
                    ⚠️{" "}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); navigateToSection("details-section-5-sg"); }}
                      style={{ color: BLUE, textDecoration: "underline", cursor: "pointer" }}
                    >
                      Super Guarantee may be materially reduced
                    </a>{" "}
                    — one or more NL pathways in this comparison have SG calculated on post-NL
                    income, which can mean a significant shortfall in super contributions. Load
                    the relevant quote and check <b>Section 5 in the Details tab</b>.
                  </div>
                )}
                <div>
                  ⚠️ Consider{" "}
                  <a
                    href="https://novatedlease.guide/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: BLUE, textDecoration: "underline" }}
                  >
                    the broader risks and trade-offs
                  </a>{" "}
                  before acting on this comparison alone.
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
