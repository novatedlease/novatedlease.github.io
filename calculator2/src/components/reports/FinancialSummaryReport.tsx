import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../../engineAdapter";
import { Stat, StatGrid, SubHead, Table, th, thR, td, tdR, TOTAL_ROW } from "../ui/shared";

function money(n: number): string {
  if (Math.abs(n) < 0.005) return "$ -";
  const abs = Math.round(Math.abs(n)).toLocaleString("en-AU");
  return n < 0 ? `$ (${abs})` : `$ ${abs}`;
}

type ScenarioKey = "nl" | "cash" | "loan" | "keep";

/**
 * Financial summary comparison table. Renders the same computeFinancialSummary()
 * output v1's Section 2 worksheet renders (engine/worksheet_130.ts via
 * FinancialReport.tsx's computeFinancialSummary — the single source of truth for
 * these figures), presented as a scenario-comparison table rather than v1's
 * spreadsheet-style row-by-row layout — a deliberate redesign choice, not a
 * different calculation.
 */
export function FinancialSummaryReport(props: { inputs: Inputs }) {
  const i = props.inputs;
  const s = computeFinancialSummary({ inputs: i, taxRateInclMedicarePct: 47 });

  const scenarios: ScenarioKey[] = ["nl", "cash", ...(s.loanEnabled ? (["loan"] as const) : []), ...(s.keepEnabled ? (["keep"] as const) : [])];

  const titles: Record<ScenarioKey, string> = { nl: "Novated Lease", cash: "Cash purchase", loan: "Car loan", keep: "Keep current car" };
  const colors: Record<ScenarioKey, string> = { nl: "#0b5cab", cash: "#37474f", loan: "#4527a0", keep: "#00695c" };

  const totalAt5: Record<ScenarioKey, number> = { nl: s.nlTotalSpentAt5, cash: s.offsetTotalSpentAt5, loan: s.loanTotalSpentAt5, keep: s.keepTotalSpentAt5 };
  const totalAtLeaseEnd: Record<ScenarioKey, number> = { nl: s.nlTotalSpentAtLeaseEnd, cash: s.offsetTotalSpentAtLeaseEnd, loan: s.loanTotalSpentAtLeaseEnd, keep: s.keepTotalSpentAtLeaseEnd };
  const interestAt5: Record<ScenarioKey, number> = { nl: s.irNl.total, cash: s.irCash.total, loan: s.irLoan.total, keep: s.irKeep.total };

  const best = scenarios.reduce((a, b) => (totalAt5[a] <= totalAt5[b] ? a : b));

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <StatGrid>
        <Stat label="Lease payments over the lease" value={money(s.leasePaymentsOverLease)} color="#0b5cab" />
        <Stat label="Residual payable (inc GST)" value={money(s.residualPayableIncGst)} color="#6a1b9a" />
        <Stat label="Vehicle value at lease end" value={money(s.newEvValueAtLeaseEnd)} color="#00695c" />
      </StatGrid>

      <SubHead mt={16}>Total spend by pathway (standardised to a 5-year horizon)</SubHead>
      <Table>
        <thead>
          <tr>
            <th style={th()}>Pathway</th>
            <th style={thR()}>Total @ lease end ({s.yearsLease}y)</th>
            <th style={thR()}>Total @ 5y</th>
            <th style={thR()}>Home-loan interest impact</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((key) => (
            <tr key={key} style={key === best ? TOTAL_ROW : undefined}>
              <td style={td({ fontWeight: key === best ? 800 : 600, color: colors[key] })}>
                {titles[key]}
                {key === best && " ✓ lowest total"}
              </td>
              <td style={tdR()}>{money(totalAtLeaseEnd[key])}</td>
              <td style={tdR({ fontWeight: key === best ? 800 : 400 })}>{money(totalAt5[key])}</td>
              <td style={tdR()}>{money(interestAt5[key])}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div style={{ fontSize: 12, color: "var(--nlc-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
        "Home-loan interest impact" estimates the extra (or reduced) interest paid on your home loan due to reduced
        offset-account balance under each pathway, assuming a constant offset interest rate over the period.
      </div>

      {i.vehicleType === "EV" && (
        <>
          <SubHead mt={16}>Charging delta</SubHead>
          <div style={{ fontSize: 13 }}>
            Packaged electricity claim vs actual charging cost:{" "}
            <b style={{ color: s.chargingDeltaAnnual >= 0 ? "#1b5e20" : "#b71c1c" }}>{money(s.chargingDeltaAnnual)}/year</b>{" "}
            ({money(s.chargingDeltaBenefitOverLease)} over the lease).
          </div>
        </>
      )}
    </div>
  );
}
