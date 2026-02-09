import React, { useEffect, useMemo, useRef, useState } from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import type { Inputs } from "../engine/types";
import { calcResidualPayableIncGst, isFbtApplicable } from "../engine/types";
import { computeDerived } from "../engine/derived";
import { taxSummaryAUResident } from "../engine/tax_au";
import { residualPercentForYears } from "../engine/ato";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";
import { aud0 } from "../utils/format";
import { estimateAnnualChargingExpense } from "../engine/charging";
import { buildWorksheet130 } from "../engine/worksheet_130";

type WorstCaseProps = {
  inputs: Inputs;
};

const WorstCase: React.FC<WorstCaseProps> = ({ inputs }) => {
  const totalFortnights = Math.round(inputs.leaseDurationYears * 26);
  const rows = Array.from({ length: totalFortnights }, (_, i) => i + 1);

  // --- Replicate LeaseReport.tsx: Fortnight "= Total Take Home Impact" ---
  const fbtApplies = isFbtApplicable(inputs);

  // Vehicle lease per fortnight includes LV adjustment (same approach as LeaseReport)
  const vehicleLeaseFn = inputs.vehicleLeasePerFn + inputs.luxuryVehicleAdjPerFn;
  const inputsWithLv: Inputs = { ...inputs, vehicleLeasePerFn: vehicleLeaseFn };

  const d = computeDerived(inputsWithLv);
  const fyRows = d.fyRows;
  const preTaxTotalFn = d.preTaxTotalFn;

  // ECM / Employee contribution method (only relevant when FBT applies)
  const vehicleDutiableValue = Math.max(0, inputs.vehicleBaseValue);
  const fbtStatutoryRate = 0.2;
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;

  // Actual pre-tax deduction after ECM adjustments (FBT-applicable only)
  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

  // For Fortnight/Annual columns we want the MOST expensive FY take-home impact.
  // Pre-tax dollars reduce take-home by (1 - taxRate) dollars per pre-tax dollar.
  const correctedAvgLeaseTaxRateForFy = (r: (typeof fyRows)[number]) => {
    // Non-FBT path: use engine-provided average bracket
    if (!fbtApplies) {
      const rate = r.avgLeaseTaxBracketPct / 100;
      return Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
    }

    // FBT-applicable path: replicate LeaseReport FY logic with exact tax
    const preTaxDeductionThisFy = actualPreTaxDeductionFn * r.count;
    if (!(preTaxDeductionThisFy > 0) || !Number.isFinite(preTaxDeductionThisFy)) return 0;

    const postTaxEcmThisFy = ecmPerFn * r.count;

    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    const denom = r.originalTaxableIncome - postNlTaxableIncome; // should equal preTaxDeductionThisFy
    if (!(denom > 0) || !Number.isFinite(denom)) return 0;

    // Match LeaseReport: 1 - ((beforeTH - afterTH - postTaxECM) / (beforeTI - afterTI))
    const numer = r.originalTakeHome - postNlTakeHome - postTaxEcmThisFy;
    const ratio = numer / denom;
    const taxRate = 1 - ratio;

    if (!Number.isFinite(taxRate)) return 0;
    return Math.min(1, Math.max(0, taxRate));
  };

  const maxAfterTaxFactorForPreTax =
    fyRows.length > 0 ? Math.max(...fyRows.map((r) => 1 - correctedAvgLeaseTaxRateForFy(r))) : 0;

  const preTaxEquivalentPostTaxImpactFn = actualPreTaxDeductionFn * maxAfterTaxFactorForPreTax;
  const postTaxComponentFn = fbtApplies ? ecmPerFn : 0;

  // Fortnight value in LeaseReport's "= Total Take Home Impact" row
  const maxTakeHomeImpactPerPay =
    fyRows.length > 0 ? Math.max(...fyRows.map((r) => r.takeHomeImpactPerPay)) : 0;

  // Non-FBT: LeaseReport displays postTaxTotalFn, which equals maxTakeHomeImpactPerPay
  // (allocation into lease vs running is internal to LeaseReport; total equals the max FY take-home impact).
  const totalTakeHomeImpactFn = fbtApplies
    ? preTaxEquivalentPostTaxImpactFn + postTaxComponentFn
    : maxTakeHomeImpactPerPay;

  const fmtAudInt = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    if (!Number.isFinite(value)) return "—";
    return `$${aud0(Math.round(value))}`;
  };

  const remainingFortnights = (n: number) => Math.max(0, totalFortnights - n);

  // Residual payable (inc GST) — same single source of truth used in LeaseReport
  const amountFinancedExGst = financedAmountExGstFromInputs(inputs);
  const residualPct = residualPercentForYears(inputs.leaseDurationYears);
  const residualPayableIncGst = calcResidualPayableIncGst({
    amountFinancedExGst,
    leaseDocFeeExGst: inputs.leaseDocFee,
    residualPct,
  });

  // --- Offset cash: average running cost per fortnight (simplified) ---
  // Inputs in the running-cost section are entered as:
  // - ex GST when GST saving is passed on (typical NL treatment)
  // - inc GST when GST saving is NOT passed on
  // For the cash pathway we want out-of-pocket costs (inc GST), so apply a GST uplift when the inputs are ex GST.
  const gstUplift = inputs.gstSavingPassedOn === "Yes" ? 1.1 : 1;

  const cashServiceAnnualIncGst = Math.max(0, inputs.serviceMaintTyresAnnual) * gstUplift;
  const cashRegoAnnualIncGst = Math.max(0, inputs.registrationAnnual) * gstUplift;
  const cashInsuranceAnnualIncGst = Math.max(0, inputs.insuranceAnnual) * gstUplift;
  const cashFuelAnnualIncGst =
    inputs.vehicleType === "EV" ? 0 : Math.max(0, inputs.fuelAnnual) * gstUplift;

  // Electricity: use the *real* charging expense estimate from the Annual Electricity section (BasicInformationReport)
  const chargingExpensePerYear = estimateAnnualChargingExpense(inputs).annualChargingExpense;

  const cashRunningCostAnnualIncGst =
    cashServiceAnnualIncGst +
    cashRegoAnnualIncGst +
    cashInsuranceAnnualIncGst +
    cashFuelAnnualIncGst +
    Math.max(0, chargingExpensePerYear);

  const cashRunningCostPerFnIncGst = cashRunningCostAnnualIncGst / 26;

  // --- Additional home-loan interest vs cash baseline (Worksheet 130) ---
  // Worksheet 130 models an offset-balance delta (AE) and interest accrued each fortnight (AF).
  // Here we compute, at each termination timepoint, the cumulative interest difference between:
  // - NL cashflow profile (scenario: "nl"), and
  // - Cash purchase profile (scenario: "cash").
  // Positive values indicate NL has incurred MORE home-loan interest than the cash baseline up to that timepoint.
  const additionalHlInterestByFn = useMemo(() => {
    const wsNl = buildWorksheet130({ inputs, scenario: "nl" });
    const wsCash = buildWorksheet130({ inputs, scenario: "cash" });

    const out: number[] = [];
    let nlCum = 0;
    let cashCum = 0;

    for (let n = 1; n <= totalFortnights; n++) {
      const aNl = wsNl[n - 1]?.af ?? 0;
      const aCash = wsCash[n - 1]?.af ?? 0;
      nlCum += Number.isFinite(aNl) ? aNl : 0;
      cashCum += Number.isFinite(aCash) ? aCash : 0;

      // AF values are typically negative (cash outflows reduce offset), so flip sign into a positive "additional interest".
      const diff = nlCum - cashCum;
      const additional = -diff;
      out.push(Number.isFinite(additional) ? additional : 0);
    }

    return out;
  }, [inputs, totalFortnights]);

  const series = useMemo(() => {
    return rows.map((n) => {
      const hithertoLease = totalTakeHomeImpactFn * n;
      const remainingLeasePayout = remainingFortnights(n) * vehicleLeaseFn * 1.1;
      const residual = residualPayableIncGst;
      const nlTotal = hithertoLease + remainingLeasePayout + residual;

      const cashUpfront = inputs.driveawayCost;
      const cashHithertoRunning = cashRunningCostPerFnIncGst * n;
      const cashTotal = cashUpfront + cashHithertoRunning;

      const additionalHlInterest = additionalHlInterestByFn[n - 1] ?? 0;
      const nlAdjustedTotal = nlTotal + additionalHlInterest;

      return {
        n,
        // Novated Lease
        hithertoLease,
        remainingLeasePayout,
        residual,
        nlTotal,
        additionalHlInterest,
        nlAdjustedTotal,
        // Offset cash
        cashUpfront,
        cashHithertoRunning,
        cashTotal,
      };
    });
  }, [
    rows,
    totalTakeHomeImpactFn,
    vehicleLeaseFn,
    residualPayableIncGst,
    inputs.driveawayCost,
    cashRunningCostPerFnIncGst,
    totalFortnights,
    additionalHlInterestByFn,
  ]);

  const [showTable, setShowTable] = useState(false);
  const [adjustForHlInterest, setAdjustForHlInterest] = useState(false);

  // --- Table ---
  return (
    <div>
      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.45 }}>
        <p style={{ margin: "0 0 8px 0" }}>
          Early termination is an asymmetric risk in a novated lease: if your employment ends (e.g. redundancy), you may be forced to settle the remaining vehicle finance using post‑tax dollars (plus GST), plus the residual. In some scenarios, total out‑of‑pocket can exceed what you would have spent buying outright.
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          Read the worked example and full context here:{" "}
          <a
            href="https://novatedlease.guide/risks/how-bad-can-early-termination-get/"
            target="_blank"
            rel="noopener noreferrer"
          >
            How bad can early termination get?
          </a>
        </p>
        
        <ul style={{ margin: "0 0 10px 18px", padding: 0, color: "#444", fontSize: 12 }}>
          <li>
            Many providers also charge an <strong>early termination fee</strong> (not modelled here, typically a few hundred dollars).
          </li>
          <li>
            By default, this section models <strong>cashflow only</strong>. Turn on <strong>“Adjust for home loan interest saved”</strong> to also estimate the offset‑interest effect from keeping more cash in your mortgage offset (by not paying the purchase price upfront). This is shown as a lower “effective total spent” for the novated lease line.
          </li>
          <li>
            Other potential impacts (e.g. borrowing capacity, subsidies, superannuation) are not modelled.
          </li>
          <li>
            Cash‑pathway running costs are <strong>averaged per fortnight</strong> in this section for simplicity. In other sections they were modelled as <strong>lumpy</strong> payments (e.g. annual insurance, two-monthly electricity). This results in slight discrepancy in the final figure in cash pathway.
          </li>
        </ul>
      </div>

      <div
        style={{
          height: 1,
          background: "#e6e6e6",
          marginTop: 14,
          marginBottom: 12,
        }}
      />

      {/* Toggle: adjust for home-loan interest saved */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setAdjustForHlInterest((v) => !v)}
          aria-pressed={adjustForHlInterest}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #d6d6d6",
            background: adjustForHlInterest ? "#e8f0ff" : "#f7f7f7",
            color: "#222",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span>Adjust for home loan interest saved</span>
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 18,
              borderRadius: 999,
              background: adjustForHlInterest ? "#1565c0" : "#bdbdbd",
              position: "relative",
              transition: "background 140ms ease",
              flex: "0 0 auto",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: adjustForHlInterest ? 18 : 2,
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
                transition: "left 140ms ease",
              }}
            />
          </span>
        </button>
      </div>

      <div style={{ marginTop: 6 }}>
        <WorstCaseChart
          data={series}
          fmtMoney={fmtAudInt}
          height={280}
          useAdjustedNl={adjustForHlInterest}
          yAxisLabel={
            adjustForHlInterest
              ? "Total spent (adjusted for interest saving)"
              : "Total spent ($)"
          }
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
        This chart assumes the lease is terminated at each timepoint, triggering payout of remaining finance with post‑tax dollars (plus GST) and the residual.
      </div>
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            padding: "6px 0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            color: "#333",
          }}
        >
          <span>{showTable ? "Hide calculation table" : "Show calculation table"}</span>
          <span
            aria-hidden="true"
            style={{
              fontSize: 14,
              lineHeight: 1,
              color: "rgba(0,0,0,0.55)",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {showTable ? "▾" : "▸"}
          </span>
        </button>

        {showTable && (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...groupHeaderStyle, borderRight: "2px solid #ccc" }}></th>
                  <th style={{ ...groupHeaderStyle, borderRight: "2px solid #ccc" }} colSpan={6}>
                    Novated Lease
                  </th>
                  <th style={groupHeaderStyle} colSpan={3}>
                    Cash pathway (baseline)
                  </th>
                </tr>
                <tr>
                  <th style={{ ...thStyle, borderRight: "2px solid #ccc" }}>
                    Termination timepoint (fortnight)
                  </th>
                  <th style={thStyle}>
                    Hitherto Lease
                    <InfoTooltip
                      text={
                        "Post‑tax equivalent of lease paid so far, including running costs incurred up to this termination point. If the FY‑to‑FY take‑home impact varies (e.g. near a marginal tax threshold), this uses the most expensive FY, consistent with the Lease Report."
                      }
                    />
                  </th>
                  <th style={thStyle}>
                    Remaining Lease Payout
                    <InfoTooltip text="If a lease is terminated early, remaining vehicle finance is typically payable using post‑tax dollars, plus GST. Future running costs are not payable. Modelled here as: (remaining fortnights) × (vehicle lease per fortnight) × 1.1." />
                  </th>
                  <th style={thStyle}>
                    Residual
                    <InfoTooltip text="Residual value payable upon early termination of the lease." />
                  </th>
                  <th style={thStyle}>
                    Total Spent
                    <InfoTooltip text="Total out‑of‑pocket amount required to own the car outright at this termination point, including all running costs paid up to that time." />
                  </th>
                  <th style={thStyle}>
                    Home Loan Interest Impact
                    <InfoTooltip text="Estimated additional home‑loan interest incurred (vs the cash baseline) up to this timepoint, based on the offset‑interest model. Negative figure (typical) means the novated lease is saving interest compared to the cash pathway." />
                  </th>
                  <th style={{ ...thStyle, borderRight: "2px solid #ccc" }}>
                    Adjusted Total Spent
                    <InfoTooltip text="Adjusted total cost at this timepoint, defined as: total spent + home loan interest impact." />
                  </th>
                  <th style={thStyle}>
                    Upfront cost
                    <InfoTooltip text="Upfront out‑of‑pocket to acquire the car in the cash pathway (e.g. purchase price and any on‑road costs you choose to include)." />
                  </th>
                  <th style={thStyle}>
                    Hitherto running cost
                    <InfoTooltip text="Running costs incurred so far in the cash pathway up to this termination timepoint (e.g. registration, insurance, fuel/electricity, servicing). While in reality running costs are lumpy, this model assumes a constant running cost per fortnight for simplicity." />
                  </th>
                  <th style={thStyle}>
                    Total Spent
                    <InfoTooltip text="Total out‑of‑pocket spent in the cash pathway by this timepoint: upfront cost plus running costs incurred so far." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.map((r) => (
                  <tr key={r.n}>
                    <td style={{ ...tdStyle, borderRight: "2px solid #ccc" }}>{r.n}</td>

                    {/* Novated Lease */}
                    <td style={tdStyle}>{fmtAudInt(r.hithertoLease)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.remainingLeasePayout)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.residual)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.nlTotal)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.additionalHlInterest)}</td>
                    <td style={{ ...tdStyle, borderRight: "2px solid #ccc" }}>{fmtAudInt(r.nlAdjustedTotal)}</td>

                    {/* Cash pathway */}
                    <td style={tdStyle}>{fmtAudInt(r.cashUpfront)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.cashHithertoRunning)}</td>
                    <td style={tdStyle}>{fmtAudInt(r.cashTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

type WorstCasePoint = {
  n: number;
  nlTotal: number;
  nlAdjustedTotal?: number;
  cashTotal: number;
};

type WorstCaseChartProps = {
  data: WorstCasePoint[];
  fmtMoney: (value: number | null | undefined) => string;
  height?: number;
  useAdjustedNl?: boolean;
  yAxisLabel?: string;
};

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      setWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

const WorstCaseChart: React.FC<WorstCaseChartProps> = ({
  data,
  fmtMoney,
  height = 280,
  useAdjustedNl = false,
  yAxisLabel = "Total spent ($)",
}) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hoverN, setHoverN] = useState<number | null>(null);

  const margin = { top: 16, right: 16, bottom: 38, left: 84 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const nlVal = (d: WorstCasePoint) =>
    useAdjustedNl ? (d.nlAdjustedTotal ?? d.nlTotal) : d.nlTotal;

  const maxY = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(
      ...data.map((d) => Math.max(nlVal(d), d.cashTotal)).filter((v) => Number.isFinite(v))
    );
  }, [data, nlVal]);

  const niceMaxY = useMemo(() => {
    if (!(maxY > 0)) return 1;

    // Add a small headroom so the top line doesn't clip.
    const headroomY = maxY * 1.03;

    const magnitude = Math.pow(10, Math.floor(Math.log10(headroomY)));
    const scaled = headroomY / magnitude;

    // Prefer tighter bounds than the classic 1/2/5/10 ladder.
    // This avoids cases like 108k -> 200k which makes the chart look flat.
    const candidates = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const step = candidates.find((c) => scaled <= c) ?? 10;

    return step * magnitude;
  }, [maxY]);

  const xForN = (n: number) => {
    const idx = n - 1;
    if (data.length <= 1) return margin.left;
    const step = innerW / (data.length - 1);
    return margin.left + idx * step;
  };

  const yForVal = (v: number) => {
    const clamped = Math.max(0, Math.min(niceMaxY, v));
    const t = niceMaxY === 0 ? 0 : clamped / niceMaxY;
    return margin.top + (1 - t) * innerH;
  };

  const nlPath = useMemo(() => {
    if (data.length === 0 || innerW === 0) return "";
    return data
      .map((d) => `${xForN(d.n)},${yForVal(nlVal(d))}`)
      .join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, innerW, innerH, niceMaxY, width, nlVal]);

  const cashPath = useMemo(() => {
    if (data.length === 0 || innerW === 0) return "";
    return data
      .map((d) => `${xForN(d.n)},${yForVal(d.cashTotal)}`)
      .join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, innerW, innerH, niceMaxY, width]);

  const onMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;

    const x0 = margin.left;
    const x1 = margin.left + innerW;
    const xc = Math.max(x0, Math.min(x1, x));

    const t = innerW === 0 ? 0 : (xc - x0) / innerW;
    const idx = Math.round(t * (data.length - 1));
    const n = data[Math.max(0, Math.min(data.length - 1, idx))]?.n ?? null;
    setHoverN(n);
  };

  const onLeave = () => setHoverN(null);

  const hovered = hoverN === null ? null : data[hoverN - 1];
  const hoverX = hovered ? xForN(hovered.n) : null;
  const hoverYnl = hovered ? yForVal(nlVal(hovered)) : null;
  const hoverYcash = hovered ? yForVal(hovered.cashTotal) : null;

  // --- Break-even (crossover) calculation ---
  const crossover = useMemo(() => {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if ((nlVal(prev) - prev.cashTotal) * (nlVal(curr) - curr.cashTotal) <= 0) {
        // Linear interpolation between fortnights
        const d0 = nlVal(prev) - prev.cashTotal;
        const d1 = nlVal(curr) - curr.cashTotal;
        const t = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1));
        return prev.n + t * (curr.n - prev.n);
      }
    }
    return null;
  }, [data, nlVal]);

  type Pt = { x: number; y: number };

  const buildAreaPaths = useMemo(() => {
    const red: string[] = [];
    const green: string[] = [];

    if (data.length < 2 || innerW === 0 || innerH === 0) return { red, green };

    const diff = (i: number) => nlVal(data[i]!) - data[i]!.cashTotal;

    const toPtTopBot = (i: number, type: "red" | "green"): { top: Pt; bot: Pt } => {
      const x = xForN(data[i]!.n);
      const nlY = yForVal(nlVal(data[i]!));
      const cashY = yForVal(data[i]!.cashTotal);

      if (type === "red") {
        // NL above Cash
        return { top: { x, y: nlY }, bot: { x, y: cashY } };
      }
      // Cash above NL
      return { top: { x, y: cashY }, bot: { x, y: nlY } };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const addRegionPath = (type: "red" | "green", topPts: Pt[], botPts: Pt[]) => {
      if (topPts.length < 2 || botPts.length < 2) return;
      const path =
        `M ${topPts[0]!.x} ${topPts[0]!.y} ` +
        topPts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
        " " +
        botPts
          .slice()
          .reverse()
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ") +
        " Z";

      (type === "red" ? red : green).push(path);
    };

    // Walk segments and split on crossings so each filled region has a single color.
    let i = 0;
    while (i < data.length - 1) {
      const d0 = diff(i);
      if (d0 === 0) {
        i += 1;
        continue;
      }

      const type: "red" | "green" = d0 > 0 ? "red" : "green";
      let topPts: Pt[] = [];
      let botPts: Pt[] = [];

      // start at i
      {
        const tb = toPtTopBot(i, type);
        topPts.push(tb.top);
        botPts.push(tb.bot);
      }

      let j = i;
      while (j < data.length - 1) {
        const dA = diff(j);
        const dB = diff(j + 1);

        // If no sign change, add full next point and continue.
        if (dA === 0 || dB === 0 || (dA > 0) === (dB > 0)) {
          const tbNext = toPtTopBot(j + 1, type);
          topPts.push(tbNext.top);
          botPts.push(tbNext.bot);
          j += 1;
          continue;
        }

        // Sign change between j and j+1: compute intersection (linear interpolation).
        const t = Math.abs(dA) / (Math.abs(dA) + Math.abs(dB));

        const xA = xForN(data[j]!.n);
        const xB = xForN(data[j + 1]!.n);

        const nlYA = yForVal(nlVal(data[j]!));
        const nlYB = yForVal(nlVal(data[j + 1]!));
        const cashYA = yForVal(data[j]!.cashTotal);
        const cashYB = yForVal(data[j + 1]!.cashTotal);

        const xI = lerp(xA, xB, t);
        const nlYI = lerp(nlYA, nlYB, t);
        const cashYI = lerp(cashYA, cashYB, t);

        // At the intersection, nlYI == cashYI in value-space; in pixel-space these should also be equal.
        // Use the average to avoid tiny numeric differences.
        const yI = (nlYI + cashYI) / 2;

        // Add intersection point to close this region.
        if (type === "red") {
          topPts.push({ x: xI, y: yI });
          botPts.push({ x: xI, y: yI });
        } else {
          topPts.push({ x: xI, y: yI });
          botPts.push({ x: xI, y: yI });
        }

        addRegionPath(type, topPts, botPts);

        // Start next region at the intersection
        i = j + 1;
        topPts = [{ x: xI, y: yI }];
        botPts = [{ x: xI, y: yI }];

        // The while(i<...) outer loop will continue from updated i.
        break;
      }

      // If we reached the end without a sign change, finalize this region.
      if (j >= data.length - 1) {
        addRegionPath(type, topPts, botPts);
        break;
      }

      // Continue outer loop from new i (already set) if a crossing occurred.
      if (i <= j) {
        i = j + 1;
      }
    }

    return { red, green };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, innerW, innerH, niceMaxY, width, nlVal]);

  // Y-axis ticks (nice increments like 25k, 50k, etc.)
  const yTicks = useMemo(() => {
    const out: { y: number; v: number }[] = [];
    if (!(niceMaxY > 0)) {
      out.push({ v: 0, y: yForVal(0) });
      return out;
    }

    // Aim for ~5 intervals (=> 6 tick labels including 0 and max)
    const targetStep = niceMaxY / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
    const scaled = targetStep / magnitude;

    const candidates = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const stepScaled = candidates.find((c) => scaled <= c) ?? 10;
    const step = stepScaled * magnitude;

    // Generate ticks from 0 to niceMaxY inclusive
    for (let v = 0; v <= niceMaxY + step / 2; v += step) {
      const vv = Math.min(niceMaxY, v);
      out.push({ v: vv, y: yForVal(vv) });
      if (vv === niceMaxY) break;
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niceMaxY, width, innerH]);

  // Compact Y-axis tick formatter: $50k, $100k, etc.
  const fmtAxisK = (v: number) => {
    if (!Number.isFinite(v)) return "";
    if (v === 0) return "$0";
    if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`;
    return `$${Math.round(v)}`;
  };

  // Colors: keep on-brand blue, plus a high-contrast accent for readability
  const nlColor = "#1565c0"; // deeper blue
  const cashColor = "#f57c00"; // orange (high contrast against blue)

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Total spent vs termination timepoint</div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.85, flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: nlColor, display: "inline-block", borderRadius: 2 }} />
              <span>Novated Lease</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: cashColor, display: "inline-block", borderRadius: 2 }} />
              <span>Cash pathway (baseline)</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            <span style={{ color: "#e53935" }}>Red area</span> = Novated Lease costs more · 
            <span style={{ color: "#43a047" }}>Green area</span> = Novated Lease costs less
          </div>
        </div>
      </div>

      <svg
        width="100%"
        height={height}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ marginTop: 8, background: "#fff" }}
      >
        <defs>
          <linearGradient id="nlAboveCashRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e53935" stopOpacity={0.30} />
            <stop offset="100%" stopColor="#e53935" stopOpacity={0.06} />
          </linearGradient>
          <linearGradient id="nlBelowCashGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43a047" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#43a047" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        {/* Grid + Y labels */}
        {yTicks.map((t) => (
          <g key={t.v}>
            <line
              x1={margin.left}
              x2={margin.left + innerW}
              y1={t.y}
              y2={t.y}
              stroke="#e6e6e6"
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="#666"
            >
              {fmtAxisK(t.v)}
            </text>
          </g>
        ))}
        {/* X-axis year ticks (every 26 fortnights) */}
        {(() => {
          const years = Math.floor(data.length / 26);
          const ticks = Array.from({ length: years }, (_, i) => i + 1);
          const y0 = margin.top + innerH;
          return ticks.map((yr) => {
            const n = yr * 26;
            if (n < 1 || n > data.length) return null;
            const x = xForN(n);
            return (
              <g key={yr}>
                <line x1={x} x2={x} y1={y0} y2={y0 + 5} stroke="#888" strokeWidth={1} />
                <text
                  x={x}
                  y={y0 + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#666"
                >
                  {yr}y
                </text>
              </g>
            );
          });
        })()}

        {/* Axes */}
        <line
          x1={margin.left}
          x2={margin.left}
          y1={margin.top}
          y2={margin.top + innerH}
          stroke="#bbb"
          strokeWidth={1}
        />
        <line
          x1={margin.left}
          x2={margin.left + innerW}
          y1={margin.top + innerH}
          y2={margin.top + innerH}
          stroke="#bbb"
          strokeWidth={1}
        />

        {/* Area between curves: red where NL > cash, green where NL < cash */}
        {buildAreaPaths.green.map((d, idx) => (
          <path key={`g-${idx}`} d={d} fill="url(#nlBelowCashGreen)" />
        ))}
        {buildAreaPaths.red.map((d, idx) => (
          <path key={`r-${idx}`} d={d} fill="url(#nlAboveCashRed)" />
        ))}
        {/* Break-even (crossover) vertical marker */}
        {crossover !== null && (
          <g>
            <line
              x1={xForN(crossover)}
              x2={xForN(crossover)}
              y1={margin.top}
              y2={margin.top + innerH}
              stroke="#555"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <g transform={`translate(${xForN(crossover) + 6}, ${margin.top + 4})`}>
              <rect x={0} y={0} width={118} height={18} rx={9} fill="#f2f2f2" stroke="#cfcfcf" />
              <text x={10} y={12} fontSize={11} fill="#333">
                Break-even ≈ {(crossover / 26).toFixed(1)}y
              </text>
            </g>
          </g>
        )}

        {/* Series */}
        <polyline
          points={nlPath}
          fill="none"
          stroke={nlColor}
          strokeWidth={2.5}
        />
        <polyline
          points={cashPath}
          fill="none"
          stroke={cashColor}
          strokeWidth={2.5}
        />

        {/* Hover indicator */}
        {hovered && hoverX !== null && (
          <g>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={margin.top}
              y2={margin.top + innerH}
              stroke="#999"
              strokeDasharray="4 4"
              strokeWidth={1}
              opacity={0.8}
            />
            {hoverYnl !== null && (
              <circle cx={hoverX} cy={hoverYnl} r={4} fill={nlColor} />
            )}
            {hoverYcash !== null && (
              <circle cx={hoverX} cy={hoverYcash} r={4} fill={cashColor} />
            )}

            {/* Tooltip */}
            <g>
              {(() => {
                const pad = 8;
                const lines = [
  `Fortnight: ${hovered.n}`,
  `NL total spent: ${fmtMoney(nlVal(hovered))}`,
  `Cash pathway total spent: ${fmtMoney(hovered.cashTotal)}`,
];

                const x = Math.min(
                  margin.left + innerW - 260,
                  Math.max(margin.left + 8, (hoverX ?? 0) + 12)
                );
                const y = margin.top + 10;

                return (
                  <g transform={`translate(${x}, ${y})`}>
                    <rect
  x={0}
  y={0}
  width={260}
  height={62}
  rx={8}
  fill="#111"
  opacity={0.85}
/>
<text x={pad} y={18} fontSize={12} fill="#fff">
  {lines[0]}
</text>
<text x={pad} y={36} fontSize={12} fill="#fff">
  {lines[1]}
</text>
<text x={pad} y={54} fontSize={12} fill="#fff">
  {lines[2]}
</text>
                  </g>
                );
              })()}
            </g>
          </g>
        )}

        {/* Axis labels */}
        <text
          x={margin.left + innerW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#666"
        >
          Termination timepoint (years)
        </text>
        <text
          x={18}
          y={margin.top + innerH / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#666"
          transform={`rotate(-90 18 ${margin.top + innerH / 2})`}
        >
          {yAxisLabel}
        </text>
      </svg>
    </div>
  );
};

const groupHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "6px 8px",
  borderBottom: "1px solid #ddd",
  fontWeight: 700,
  fontSize: 12,
  background: "#fafafa",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #ddd",
  fontWeight: 600,
  whiteSpace: "normal",
  lineHeight: 1.3,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

export default WorstCase;