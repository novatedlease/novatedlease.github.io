import React, { useEffect, useMemo, useRef, useState } from "react";
import { InfoTooltip } from "../ui/InfoTooltip";
import type { Inputs } from "@engine/types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate } from "@engine/types";
import { computeDerived } from "@engine/derived";
import { taxSummaryAUResident } from "@engine/tax_au";
import { aud0 } from "../../utils/format";
import { estimateAnnualChargingExpense } from "@engine/charging";
import { buildWorksheet130 } from "@engine/worksheet_130";
import { NoteBox, SubHead } from "../ui/shared";

type WorstCaseProps = { inputs: Inputs };

/** Ported from calculator/src/components/WorstCase.tsx — same maths/structure/chart. */
export const WorstCase: React.FC<WorstCaseProps> = ({ inputs }) => {
  const totalFortnights = Math.round(inputs.leaseDurationYears * 26);
  const rows = Array.from({ length: totalFortnights }, (_, i) => i + 1);

  const fbtApplies = isFbtApplicable(inputs);

  const vehicleLeaseFn = inputs.vehicleLeasePerFn + inputs.luxuryVehicleAdjPerFn;
  const inputsWithLv: Inputs = { ...inputs, vehicleLeasePerFn: vehicleLeaseFn };

  const d = computeDerived(inputsWithLv);
  const fyRows = d.fyRows;
  const preTaxTotalFn = d.preTaxTotalFn;

  const vehicleDutiableValue = Math.max(0, inputs.vehicleBaseValue);
  const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(inputs));
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;

  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

  const correctedAvgLeaseTaxRateForFy = (r: (typeof fyRows)[number]) => {
    if (!fbtApplies) {
      const rate = r.avgLeaseTaxBracketPct / 100;
      return Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
    }

    const preTaxDeductionThisFy = actualPreTaxDeductionFn * r.count;
    if (!(preTaxDeductionThisFy > 0) || !Number.isFinite(preTaxDeductionThisFy)) return 0;

    const postTaxEcmThisFy = ecmPerFn * r.count;

    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    const denom = r.originalTaxableIncome - postNlTaxableIncome;
    if (!(denom > 0) || !Number.isFinite(denom)) return 0;

    const numer = r.originalTakeHome - postNlTakeHome - postTaxEcmThisFy;
    const ratio = numer / denom;
    const taxRate = 1 - ratio;

    if (!Number.isFinite(taxRate)) return 0;
    return Math.min(1, Math.max(0, taxRate));
  };

  const maxAfterTaxFactorForPreTax = fyRows.length > 0 ? Math.max(...fyRows.map((r) => 1 - correctedAvgLeaseTaxRateForFy(r))) : 0;

  const preTaxEquivalentPostTaxImpactFn = actualPreTaxDeductionFn * maxAfterTaxFactorForPreTax;
  const postTaxComponentFn = fbtApplies ? ecmPerFn : 0;

  const maxTakeHomeImpactPerPay = fyRows.length > 0 ? Math.max(...fyRows.map((r) => r.takeHomeImpactPerPay)) : 0;

  const totalTakeHomeImpactFn = fbtApplies ? preTaxEquivalentPostTaxImpactFn + postTaxComponentFn : maxTakeHomeImpactPerPay;

  const fmtAudInt = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    if (!Number.isFinite(value)) return "—";
    return `$${aud0(Math.round(value))}`;
  };

  const remainingFortnights = (n: number) => Math.max(0, totalFortnights - n);

  const residualPayableIncGst = inputs.residualValueExGst * 1.1;

  const gstUplift = inputs.gstSavingPassedOn === "Yes" ? 1.1 : 1;

  const cashServiceAnnualIncGst = Math.max(0, inputs.serviceMaintTyresAnnual) * gstUplift;
  const cashRegoAnnualIncGst = Math.max(0, inputs.registrationAnnual) * gstUplift;
  const cashInsuranceAnnualIncGst = Math.max(0, inputs.insuranceAnnual) * gstUplift;
  const cashFuelAnnualIncGst = inputs.vehicleType === "EV" ? 0 : Math.max(0, inputs.fuelAnnual) * gstUplift;

  const chargingExpensePerYear = estimateAnnualChargingExpense(inputs).annualChargingExpense;

  const cashRunningCostAnnualIncGst =
    cashServiceAnnualIncGst + cashRegoAnnualIncGst + cashInsuranceAnnualIncGst + cashFuelAnnualIncGst + Math.max(0, chargingExpensePerYear);

  const cashRunningCostPerFnIncGst = cashRunningCostAnnualIncGst / 26;

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

      return { n, hithertoLease, remainingLeasePayout, residual, nlTotal, additionalHlInterest, nlAdjustedTotal, cashUpfront, cashHithertoRunning, cashTotal };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, totalTakeHomeImpactFn, vehicleLeaseFn, residualPayableIncGst, inputs.driveawayCost, cashRunningCostPerFnIncGst, totalFortnights, additionalHlInterestByFn]);

  const [showTable, setShowTable] = useState(false);
  const [adjustForHlInterest, setAdjustForHlInterest] = useState(false);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <NoteBox color="#b71c1c" mt={0}>
        <span>
          Early termination is an asymmetric risk: if your employment ends, you may be forced to settle remaining vehicle
          finance using post-tax dollars (plus GST), plus the residual. In some scenarios, total out-of-pocket can exceed
          what you would have spent buying outright.
        </span>{" "}
        <a href="https://novatedlease.guide/risks/how-bad-can-early-termination-get/" target="_blank" rel="noopener noreferrer">
          How bad can early termination get?
        </a>
      </NoteBox>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--nlc-text-muted)", lineHeight: 1.55 }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Many providers also charge an <b>early termination fee</b> (not modelled — typically a few hundred dollars).</li>
          <li>By default, this section models <b>cashflow only</b>. Turn on "Adjust for home loan interest saved" to estimate the offset-interest effect.</li>
          <li>Cash-pathway running costs are <b>averaged per fortnight</b> for simplicity (other sections model lumpy payments — slight discrepancy may result).</li>
        </ul>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setAdjustForHlInterest((v) => !v)}
          aria-pressed={adjustForHlInterest}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, border: "1px solid #d6d6d6", background: adjustForHlInterest ? "#e8f0ff" : "#f7f7f7", color: "#222", fontSize: 12, fontWeight: 700, cursor: "pointer", userSelect: "none" }}
        >
          <span>Adjust for home loan interest saved</span>
          <span aria-hidden="true" style={{ width: 34, height: 18, borderRadius: 999, background: adjustForHlInterest ? "#1565c0" : "#bdbdbd", position: "relative", flex: "0 0 auto" }}>
            <span style={{ position: "absolute", top: 2, left: adjustForHlInterest ? 18 : 2, width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.18)" }} />
          </span>
        </button>
      </div>

      <div style={{ marginTop: 6 }}>
        <WorstCaseChart
          data={series}
          fmtMoney={fmtAudInt}
          height={280}
          useAdjustedNl={adjustForHlInterest}
          yAxisLabel={adjustForHlInterest ? "Total spent (adjusted for interest saving)" : "Total spent ($)"}
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
        This chart assumes the lease is terminated at each timepoint, triggering payout of remaining finance with
        post-tax dollars (plus GST) and the residual.
      </div>
      <SubHead mt={14}>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, font: "inherit", color: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
        >
          <span>{showTable ? "Hide calculation table" : "Show calculation table"}</span>
          <span style={{ fontSize: 12 }}>{showTable ? "▾" : "▸"}</span>
        </button>
      </SubHead>

      {showTable && (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 4 }}>
          <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...groupHeaderStyle, background: "#4a4a4a", color: "#fff", borderRight: "2px solid rgba(255,255,255,0.2)" }}></th>
                <th style={{ ...groupHeaderStyle, background: "#0b5cab", color: "#fff", borderRight: "2px solid rgba(255,255,255,0.2)" }} colSpan={6}>
                  Novated Lease
                </th>
                <th style={{ ...groupHeaderStyle, background: "#1b5e20", color: "#fff" }} colSpan={3}>
                  Cash pathway (baseline)
                </th>
              </tr>
              <tr>
                <th style={{ ...thStyle, borderRight: "2px solid rgba(0,0,0,0.15)" }}>Termination timepoint (fortnight)</th>
                <th style={thNlStyle}>
                  Hitherto Lease
                  <InfoTooltip text="Post-tax equivalent of lease paid so far, including running costs incurred up to this termination point. If the FY-to-FY take-home impact varies (e.g. near a marginal tax threshold), this uses the most expensive FY, consistent with the Lease Report." />
                </th>
                <th style={thNlStyle}>
                  Remaining Lease Payout
                  <InfoTooltip text="If a lease is terminated early, remaining vehicle finance is typically payable using post-tax dollars, plus GST. Future running costs are not payable. Modelled here as: (remaining fortnights) × (vehicle lease + luxury car adjustment per fortnight) × 1.1." />
                </th>
                <th style={thNlStyle}>
                  Residual
                  <InfoTooltip text="Residual value payable upon early termination of the lease." />
                </th>
                <th style={thNlStyle}>
                  Total Spent
                  <InfoTooltip text="Total out-of-pocket amount required to own the car outright at this termination point, including all running costs paid up to that time." />
                </th>
                <th style={thNlStyle}>
                  Home Loan Interest Impact
                  <InfoTooltip text="Estimated additional home-loan interest incurred (vs the cash baseline) up to this timepoint, based on the offset-interest model. Negative figure (typical) means the novated lease is saving interest compared to the cash pathway." />
                </th>
                <th style={{ ...thNlStyle, borderRight: "2px solid rgba(11,92,171,0.3)" }}>
                  Adjusted Total Spent
                  <InfoTooltip text="Adjusted total cost at this timepoint, defined as: total spent + home loan interest impact." />
                </th>
                <th style={thCashStyle}>
                  Upfront cost
                  <InfoTooltip text="Upfront out-of-pocket to acquire the car in the cash pathway (e.g. purchase price and any on-road costs you choose to include)." />
                </th>
                <th style={thCashStyle}>
                  Hitherto running cost
                  <InfoTooltip text="Running costs incurred so far in the cash pathway up to this termination timepoint (e.g. registration, insurance, fuel/electricity, servicing). While in reality running costs are lumpy, this model assumes a constant running cost per fortnight for simplicity." />
                </th>
                <th style={thCashStyle}>
                  Total Spent
                  <InfoTooltip text="Total out-of-pocket spent in the cash pathway by this timepoint: upfront cost plus running costs incurred so far." />
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((r) => (
                <tr key={r.n}>
                  <td style={{ ...tdStyle, borderRight: "2px solid #ccc" }}>{r.n}</td>
                  <td style={tdStyle}>{fmtAudInt(r.hithertoLease)}</td>
                  <td style={tdStyle}>{fmtAudInt(r.remainingLeasePayout)}</td>
                  <td style={tdStyle}>{fmtAudInt(r.residual)}</td>
                  <td style={tdStyle}>{fmtAudInt(r.nlTotal)}</td>
                  <td style={tdStyle}>{fmtAudInt(r.additionalHlInterest)}</td>
                  <td style={{ ...tdStyle, borderRight: "2px solid #ccc" }}>{fmtAudInt(r.nlAdjustedTotal)}</td>
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
  );
};

type WorstCasePoint = { n: number; nlTotal: number; nlAdjustedTotal?: number; cashTotal: number };

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
      setWidth(entry.contentRect.width);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

const WorstCaseChart: React.FC<WorstCaseChartProps> = ({ data, fmtMoney, height = 280, useAdjustedNl = false, yAxisLabel = "Total spent ($)" }) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hoverN, setHoverN] = useState<number | null>(null);

  const margin = { top: 16, right: 16, bottom: 38, left: 84 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const nlVal = (d: WorstCasePoint) => (useAdjustedNl ? d.nlAdjustedTotal ?? d.nlTotal : d.nlTotal);

  const maxY = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => Math.max(nlVal(d), d.cashTotal)).filter((v) => Number.isFinite(v)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, nlVal]);

  const niceMaxY = useMemo(() => {
    if (!(maxY > 0)) return 1;
    const headroomY = maxY * 1.03;
    const magnitude = Math.pow(10, Math.floor(Math.log10(headroomY)));
    const scaled = headroomY / magnitude;
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
    return data.map((d) => `${xForN(d.n)},${yForVal(nlVal(d))}`).join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, innerW, innerH, niceMaxY, width, nlVal]);

  const cashPath = useMemo(() => {
    if (data.length === 0 || innerW === 0) return "";
    return data.map((d) => `${xForN(d.n)},${yForVal(d.cashTotal)}`).join(" ");
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

  const crossover = useMemo(() => {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]!;
      const curr = data[i]!;
      if ((nlVal(prev) - prev.cashTotal) * (nlVal(curr) - curr.cashTotal) <= 0) {
        const d0 = nlVal(prev) - prev.cashTotal;
        const d1 = nlVal(curr) - curr.cashTotal;
        const t = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1));
        return prev.n + t * (curr.n - prev.n);
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (type === "red") return { top: { x, y: nlY }, bot: { x, y: cashY } };
      return { top: { x, y: cashY }, bot: { x, y: nlY } };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const addRegionPath = (type: "red" | "green", topPts: Pt[], botPts: Pt[]) => {
      if (topPts.length < 2 || botPts.length < 2) return;
      const path =
        `M ${topPts[0]!.x} ${topPts[0]!.y} ` +
        topPts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
        " " +
        botPts.slice().reverse().map((p) => `L ${p.x} ${p.y}`).join(" ") +
        " Z";
      (type === "red" ? red : green).push(path);
    };

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

      {
        const tb = toPtTopBot(i, type);
        topPts.push(tb.top);
        botPts.push(tb.bot);
      }

      let j = i;
      while (j < data.length - 1) {
        const dA = diff(j);
        const dB = diff(j + 1);

        if (dA === 0 || dB === 0 || (dA > 0) === (dB > 0)) {
          const tbNext = toPtTopBot(j + 1, type);
          topPts.push(tbNext.top);
          botPts.push(tbNext.bot);
          j += 1;
          continue;
        }

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
        const yI = (nlYI + cashYI) / 2;

        topPts.push({ x: xI, y: yI });
        botPts.push({ x: xI, y: yI });

        addRegionPath(type, topPts, botPts);

        i = j + 1;
        topPts = [{ x: xI, y: yI }];
        botPts = [{ x: xI, y: yI }];
        break;
      }

      if (j >= data.length - 1) {
        addRegionPath(type, topPts, botPts);
        break;
      }

      if (i <= j) i = j + 1;
    }

    return { red, green };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, innerW, innerH, niceMaxY, width, nlVal]);

  const yTicks = useMemo(() => {
    const out: { y: number; v: number }[] = [];
    if (!(niceMaxY > 0)) {
      out.push({ v: 0, y: yForVal(0) });
      return out;
    }

    const targetStep = niceMaxY / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
    const scaled = targetStep / magnitude;

    const candidates = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const stepScaled = candidates.find((c) => scaled <= c) ?? 10;
    const step = stepScaled * magnitude;

    for (let v = 0; v <= niceMaxY + step / 2; v += step) {
      const vv = Math.min(niceMaxY, v);
      out.push({ v: vv, y: yForVal(vv) });
      if (vv === niceMaxY) break;
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niceMaxY, width, innerH]);

  const fmtAxisK = (v: number) => {
    if (!Number.isFinite(v)) return "";
    if (v === 0) return "$0";
    if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`;
    return `$${Math.round(v)}`;
  };

  const nlColor = "#1565c0";
  const cashColor = "#f57c00";

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Total spent vs termination timepoint</div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.85, flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
            <span style={{ color: "#e53935" }}>Red area</span> = Novated Lease costs more ·{" "}
            <span style={{ color: "#43a047" }}>Green area</span> = Novated Lease costs less
          </div>
        </div>
      </div>

      <svg width="100%" height={height} onMouseMove={onMove} onMouseLeave={onLeave} style={{ marginTop: 8, background: "#fff" }}>
        <defs>
          <linearGradient id="nlAboveCashRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e53935" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#e53935" stopOpacity={0.06} />
          </linearGradient>
          <linearGradient id="nlBelowCashGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43a047" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#43a047" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t.v}>
            <line x1={margin.left} x2={margin.left + innerW} y1={t.y} y2={t.y} stroke="#e6e6e6" strokeWidth={1} />
            <text x={margin.left - 8} y={t.y} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#666">
              {fmtAxisK(t.v)}
            </text>
          </g>
        ))}
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
                <text x={x} y={y0 + 18} textAnchor="middle" fontSize={11} fill="#666">
                  {yr}y
                </text>
              </g>
            );
          });
        })()}

        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + innerH} stroke="#bbb" strokeWidth={1} />
        <line x1={margin.left} x2={margin.left + innerW} y1={margin.top + innerH} y2={margin.top + innerH} stroke="#bbb" strokeWidth={1} />

        {buildAreaPaths.green.map((d, idx) => (
          <path key={`g-${idx}`} d={d} fill="url(#nlBelowCashGreen)" />
        ))}
        {buildAreaPaths.red.map((d, idx) => (
          <path key={`r-${idx}`} d={d} fill="url(#nlAboveCashRed)" />
        ))}
        {crossover !== null && (
          <g>
            <line x1={xForN(crossover)} x2={xForN(crossover)} y1={margin.top} y2={margin.top + innerH} stroke="#555" strokeDasharray="3 3" strokeWidth={1} />
            <g transform={`translate(${xForN(crossover) + 6}, ${margin.top + 4})`}>
              <rect x={0} y={0} width={118} height={18} rx={9} fill="#f2f2f2" stroke="#cfcfcf" />
              <text x={10} y={12} fontSize={11} fill="#333">
                Break-even ≈ {(crossover / 26).toFixed(1)}y
              </text>
            </g>
          </g>
        )}

        <polyline points={nlPath} fill="none" stroke={nlColor} strokeWidth={2.5} />
        <polyline points={cashPath} fill="none" stroke={cashColor} strokeWidth={2.5} />

        {hovered && hoverX !== null && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={margin.top} y2={margin.top + innerH} stroke="#999" strokeDasharray="4 4" strokeWidth={1} opacity={0.8} />
            {hoverYnl !== null && <circle cx={hoverX} cy={hoverYnl} r={4} fill={nlColor} />}
            {hoverYcash !== null && <circle cx={hoverX} cy={hoverYcash} r={4} fill={cashColor} />}

            <g>
              {(() => {
                const pad = 8;
                const lines = [`Fortnight: ${hovered.n}`, `NL total spent: ${fmtMoney(nlVal(hovered))}`, `Cash pathway total spent: ${fmtMoney(hovered.cashTotal)}`];
                const x = Math.min(margin.left + innerW - 260, Math.max(margin.left + 8, (hoverX ?? 0) + 12));
                const y = margin.top + 10;

                return (
                  <g transform={`translate(${x}, ${y})`}>
                    <rect x={0} y={0} width={260} height={62} rx={8} fill="#111" opacity={0.85} />
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

        <text x={margin.left + innerW / 2} y={height - 6} textAnchor="middle" fontSize={12} fill="#666">
          Termination timepoint (years)
        </text>
        <text x={18} y={margin.top + innerH / 2} textAnchor="middle" fontSize={12} fill="#666" transform={`rotate(-90 18 ${margin.top + innerH / 2})`}>
          {yAxisLabel}
        </text>
      </svg>
    </div>
  );
};

const groupHeaderStyle: React.CSSProperties = { textAlign: "center", padding: "7px 8px", fontWeight: 700, fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase" };
const thBase: React.CSSProperties = { textAlign: "left", padding: "6px 8px", borderBottom: "2px solid rgba(0,0,0,0.12)", fontWeight: 700, fontSize: 11, whiteSpace: "normal", lineHeight: 1.3 };
const thStyle: React.CSSProperties = { ...thBase, background: "rgba(74,74,74,0.10)", color: "#333" };
const thNlStyle: React.CSSProperties = { ...thBase, background: "rgba(11,92,171,0.10)", color: "#0b5cab" };
const thCashStyle: React.CSSProperties = { ...thBase, background: "rgba(27,94,32,0.10)", color: "#1b5e20" };
const tdStyle: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
