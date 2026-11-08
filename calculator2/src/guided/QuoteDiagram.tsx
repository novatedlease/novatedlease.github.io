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
        note: "also known as: vehicle subtotal, vehicle cost, RRP etc",
      },
      {
        key: "driveaway",
        label: "Drive-away price",
        value: "$52,400",
        note: "also: total vehicle cost, on-road cost",
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
        value: "$612.40 per fortnight",
        note: "the vehicle finance line only, not the whole package",
      },
      {
        key: "luxAdj",
        label: "Luxury vehicle adjustment",
        value: "$0.00",
        note: "only on cars above the ATO car limit",
      },
      {
        key: "running",
        label: "Running costs (servicing, rego, insurance, fees)",
        value: "$148.00 per fortnight",
      },
    ],
  },
];

/** A cartoon of a typical quote with the row we're asking about highlighted. Values are illustrative only. */
export function QuoteDiagram({
  highlight,
  values,
}: {
  highlight: QuoteKey[];
  values?: Partial<Record<QuoteKey, string>>;
}) {
  return (
    <figure
      className="gd-quote"
      aria-label="Example of where to find this on a novated lease quote"
    >
      <figcaption className="gd-quote__cap">
        Where to look on your quote (example, with your figures where you have
        entered them)
      </figcaption>
      <div className="gd-quote__paper">
        {ROWS.map((g) => (
          <div key={g.heading} className="gd-quote__group">
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
      <div className="gd-quote__foot">
        Layouts differ between providers. The labels above are the usual names.
        Amounts in blue are the ones you entered.
      </div>
    </figure>
  );
}
