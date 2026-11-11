import { useState } from "react";

export type QuoteKey =
  | "baseValue"
  | "driveaway"
  | "term"
  | "defer"
  | "docFee"
  | "residual"
  | "payment"
  | "luxAdj"
  | "running";

type Row = { key: QuoteKey; label: string; value: string; note?: string };

const ROWS: { heading: string; rows: Row[] }[] = [
  {
    heading: "Vehicle",
    rows: [
      {
        key: "baseValue",
        label: "FBT base value",
        value: "$48,990",
        note: "also: FBT value, vehicle base value; before stamp duty, rego and CTP",
      },
      {
        key: "driveaway",
        label: "Drive-away price",
        value: "$52,400",
        note: "also: on-road cost, drive-away total; the full price inc GST",
      },
    ],
  },
  {
    heading: "Finance",
    rows: [
      { key: "term", label: "Lease term", value: "60 months" },
      { key: "defer", label: "First payment", value: "after 2 months" },
      {
        key: "docFee",
        label: "Documentation fee",
        value: "$395",
        note: "may be called establishment or lease set-up fee",
      },
      {
        key: "residual",
        label: "Residual (balloon)",
        value: "$16,120 inc GST",
        note: "check whether it says inc or ex GST",
      },
    ],
  },
  {
    heading: "Payments",
    rows: [
      {
        key: "payment",
        label: "Finance / lease payment",
        value: "$612.40 per fortnight ex GST",
        note: "finance line only; check inc or ex GST",
      },
      {
        key: "luxAdj",
        label: "Luxury vehicle adjustment",
        value: "$0.00",
        note: "only on cars above the ATO car limit; also: luxury levy, non-deductible depreciation",
      },
      {
        key: "running",
        label: "Running costs (servicing, rego, insurance, fees)",
        value: "$148.00 per fortnight",
      },
    ],
  },
];

/**
 * A cartoon of a typical quote with the row we're asking about highlighted. Values are illustrative only.
 * On narrow screens it sits above the questions, so it shows only the highlighted rows until expanded.
 */
export function QuoteDiagram({
  highlight,
  values,
}: {
  highlight: QuoteKey[];
  values?: Partial<Record<QuoteKey, string>>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <figure
      className="gd-quote"
      data-expanded={expanded ? "true" : undefined}
      aria-label="Example of where to find this on a novated lease quote"
    >
      <figcaption className="gd-quote__cap">
        Where to look on a typical quote
      </figcaption>
      <div className="gd-quote__paper">
        {ROWS.map((g) => (
          <div
            key={g.heading}
            className={`gd-quote__group${g.rows.some((r) => highlight.includes(r.key)) ? "" : " gd-quote__group--off"}`}
          >
            <div className="gd-quote__heading">{g.heading}</div>
            {g.rows.map((r) => {
              const on = highlight.includes(r.key);
              const mine = values?.[r.key];
              return (
                <div
                  key={r.key}
                  className={`gd-quote__row${on ? " gd-quote__row--on" : ""}${mine ? " gd-quote__row--mine" : ""}`}
                >
                  <span className="gd-quote__label">
                    {r.label}
                    {on && r.note && (
                      <span className="gd-quote__note">{r.note}</span>
                    )}
                  </span>
                  <span className="gd-quote__value">{mine ?? r.value}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="gd-linkbtn gd-quote__more"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Show only the relevant lines" : "Show the whole example quote"}
      </button>
      <div className="gd-quote__foot">
        Layouts vary by provider. Blue amounts are the ones you entered.
      </div>
    </figure>
  );
}
