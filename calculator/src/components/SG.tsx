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

  const totalLossInSg = useMemo(() => {
    return computedRows.reduce((sum, r) => sum + r.lossInSg, 0);
  }, [computedRows]);

  return (
    <div style={{ padding: "12px 0" }}>
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

      <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Conclusion:</div>
        <div style={{ marginBottom: 8 }}>
          Over this lease term, your employer is projected to contribute <b>{formatMoney(totalLossInSg)}</b> less in superannuation.
        </div>
        <div style={{ marginBottom: 8 }}>
          The true long‑term impact is hard to model precisely: employer contributions are generally taxed at 15%,
          high‑income earners may also be affected by Division 293 tax, and whatever remains is then subject to future
          investment performance inside super.
        </div>
        <div>
          One way to partially mitigate this is to consciously replace the shortfall with an equivalent <b>concessional contribution </b>
          (subject to your contribution caps). In rough terms, the take‑home cost of contributing the same nominal amount
          is approximately the nominal figure multiplied by <b>(1 − your marginal tax rate, including the 2% Medicare levy)</b>.
        </div>
        <div style={{ marginTop: 8 }}>
          Make sure you take this into account when evaluating the net financial impact of novated lease.
        </div>
      </div>
    </div>
  );
}