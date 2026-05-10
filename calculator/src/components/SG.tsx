import { useMemo } from "react";
import { Stat, SubHead, NoteBox, Table, th, thR, td, tdR, stripe, TOTAL_ROW } from "./ui/shared";

export type SGYearRow = {
  financialYearEnding: number;
  reducedPretaxIncome: number;
};

export type SGProps = {
  rows: SGYearRow[];
  sgRatePct?: number;
};

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

export default function SG(props: SGProps) {
  const sgRatePct = props.sgRatePct ?? 12;
  const sgRate = sgRatePct / 100;

  const computedRows = useMemo(
    () =>
      props.rows
        .slice()
        .sort((a, b) => a.financialYearEnding - b.financialYearEnding)
        .map((r) => ({ ...r, lossInSg: r.reducedPretaxIncome * sgRate })),
    [props.rows, sgRate],
  );

  const totalLossInSg = useMemo(
    () => computedRows.reduce((sum, r) => sum + r.lossInSg, 0),
    [computedRows],
  );

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <NoteBox color="#e65100" mt={0}>
        Only relevant if your payroll calculates Super Guarantee on <b>post-NL income</b>.
        On informal polling this applies to ~10% of people — check with your payroll.
      </NoteBox>

      {/* ── Total loss stat ── */}
      <div style={{ marginTop: 14 }}>
        <Stat
          label="Projected total SG loss over lease term"
          value={fmtMoney(totalLossInSg)}
          color="#b71c1c"
          note="Employer contributions your employer is projected not to make"
        />
      </div>

      {/* ── Year-by-year table ── */}
      <SubHead mt={16}>Year-by-Year Breakdown</SubHead>
      <Table>
        <thead>
          <tr>
            <th style={th()}>Financial Year</th>
            <th style={thR()}>Reduced Pre-tax Income</th>
            <th style={thR()}>SG Rate</th>
            <th style={thR()}>SG Loss</th>
          </tr>
        </thead>
        <tbody>
          {computedRows.map((r, i) => (
            <tr key={r.financialYearEnding} style={stripe(i)}>
              <td style={td()}>{r.financialYearEnding}</td>
              <td style={tdR()}>{fmtMoney(r.reducedPretaxIncome)}</td>
              <td style={tdR()}>{sgRatePct.toFixed(1)}%</td>
              <td style={tdR()}>{fmtMoney(r.lossInSg)}</td>
            </tr>
          ))}
          <tr style={TOTAL_ROW}>
            <td style={td({ fontWeight: 700 })} colSpan={3}>Total SG loss</td>
            <td style={tdR({ fontWeight: 800, color: "#b71c1c" })}>{fmtMoney(totalLossInSg)}</td>
          </tr>
        </tbody>
      </Table>

      {/* ── Interpretation ── */}
      <SubHead mt={16} color="#1b5e20">Mitigation</SubHead>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(0,0,0,0.75)" }}>
        <p style={{ margin: "0 0 8px 0" }}>
          Over this lease term, your employer is projected to contribute{" "}
          <b>{fmtMoney(totalLossInSg)}</b> less in superannuation.
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          The true long-term impact is hard to model precisely — employer contributions are taxed at 15%, high-income
          earners may face Division 293 tax, and returns are subject to future investment performance inside super.
        </p>
        <p style={{ margin: 0 }}>
          One way to partially offset this is to make an equivalent <b>concessional contribution</b> (subject to
          your caps). The effective take-home cost of doing so is approximately the nominal amount ×{" "}
          <b>(1 − your marginal tax rate incl. Medicare levy)</b>.
        </p>
      </div>
    </div>
  );
}
