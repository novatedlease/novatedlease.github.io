

import { useMemo } from "react";

export type SGYearRow = {
  /** Financial year ending (e.g. 2027 for FY 2026–27) */
  financialYearEnding: number;
  /** Reduction in pre-tax income for that FY due to novated lease */
  reducedPretaxIncome: number;
};

export type SGProps = {
  rows: SGYearRow[];
  /** Super Guarantee rate (default 12%) */
  sgRatePct?: number; // e.g. 12
};

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SG(props: SGProps) {
  const sgRatePct = props.sgRatePct ?? 12;
  const sgRate = sgRatePct / 100;

  const computedRows = useMemo(() => {
    return props.rows
      .slice()
      .sort((a, b) => a.financialYearEnding - b.financialYearEnding)
      .map(r => {
        const lossInSg = r.reducedPretaxIncome * sgRate;
        return {
          ...r,
          lossInSg,
        };
      });
  }, [props.rows, sgRate]);

  return (
    <div style={{ padding: "12px 0" }}>
      <h3 style={{ margin: "0 0 6px 0" }}>SECTION 5: EFFECT ON SUPER GUARANTEE</h3>
      <div style={{ fontStyle: "italic", fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        * This section is only relevant if your payroll calculates your super guarantee on <b>post‑NL income</b>.
        On informal polling this applies to around 10% of people — please check with your payroll.
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.15)", paddingTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Financial Year</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Reduced Pretax Income</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Super Guarantee (%)</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Loss in SG Contribution</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map(r => (
              <tr key={r.financialYearEnding}>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{r.financialYearEnding}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{formatMoney(r.reducedPretaxIncome)}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{sgRatePct.toFixed(1)}%</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{formatMoney(r.lossInSg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 600 }}>Conclusion:</div>
        <div>
          This calculation is irrelevant to you if your employer calculates SG based on income <b>prior</b> to novated leasing.
        </div>
        <div>
          Please double‑check with your payroll, as the answer can materially affect your long‑term savings.
        </div>
      </div>
    </div>
  );
}