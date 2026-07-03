import React from "react";

function fmtMoney(n: number): string {
  const abs = Math.round(Math.abs(n));
  return `$${abs.toLocaleString("en-AU")}`;
}

export function VerdictBanner({
  betterOffBy,
  comparedTo,
  sub,
  children,
}: {
  /** Positive = novated lease pathway is better off; negative = worse off. */
  betterOffBy: number;
  comparedTo: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const positive = betterOffBy >= 0;
  return (
    <div className={`nlc-verdict ${positive ? "nlc-verdict--positive" : "nlc-verdict--negative"}`}>
      <div className="nlc-verdict__label">Net outcome vs {comparedTo}</div>
      <div className={`nlc-verdict__headline nlc-num ${positive ? "nlc-verdict__headline--positive" : "nlc-verdict__headline--negative"}`}>
        {positive ? "Better off by " : "Worse off by "}
        {fmtMoney(betterOffBy)}
      </div>
      {sub && <div className="nlc-verdict__sub">{sub}</div>}
      {children && <div className="nlc-verdict__row">{children}</div>}
    </div>
  );
}
