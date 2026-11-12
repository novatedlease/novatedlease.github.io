import { useState } from "react";
import { ATO_RESIDUAL_PCT } from "@engine/ato";
import { trackEvent } from "../utils/analytics";
import { Button } from "../components/ui/Button";
import {
  GST_RATE,
  driveawayFromResidual,
  emptyMoney,
  gstSavedFromDraft,
  moneyValue,
  type GuidedDraft,
  type Money,
} from "./draft";
import { Choices, Help, MoneyInput } from "./parts";

const money2 = (n: number) =>
  `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/** Within this fraction of the entered drive-away price, the derived figure counts as agreeing. */
const AGREE_WITHIN = 0.01;

/**
 * "Not on your quote?" helper under the drive-away field. Many provider quotes leave the
 * drive-away price out; it can be backed out of the residual, which nearly every quote prints.
 */
export function DriveawayHelper({
  d,
  set,
}: {
  d: GuidedDraft;
  set: <K extends keyof GuidedDraft>(k: K, v: GuidedDraft[K]) => void;
}) {
  const [residual, setResidual] = useState<Money>(() =>
    d.residualBasis === "incGst" || d.residualBasis === "exGst" ? d.residual : emptyMoney(),
  );
  const [basis, setBasis] = useState<"incGst" | "exGst" | null>(() =>
    d.residualBasis === "incGst" || d.residualBasis === "exGst" ? d.residualBasis : null,
  );
  const [pct, setPct] = useState<Money>(() =>
    d.leaseYears ? { ...emptyMoney(), text: String(ATO_RESIDUAL_PCT[d.leaseYears]) } : emptyMoney(),
  );

  const gst = gstSavedFromDraft(d);
  const residualTyped = moneyValue(residual);
  const residualExGst =
    residualTyped && basis ? (basis === "incGst" ? residualTyped / (1 + GST_RATE) : residualTyped) : null;
  const pctValue = moneyValue(pct);
  const derived =
    residualExGst != null && pctValue != null && gst != null
      ? driveawayFromResidual(residualExGst, pctValue, gst)
      : null;
  const entered = moneyValue(d.driveaway);
  const enteredIsOurs = d.driveaway.estimated;
  const gap = derived != null && entered && !enteredIsOurs ? (derived - entered) / entered : null;

  function applyFigure() {
    if (derived == null) return;
    set("driveaway", { text: String(Math.round(derived)), none: false, estimated: true });
    // Carry the residual and term across so the reader doesn't type them again on the next screen.
    if (!d.residualBasis && basis && !moneyValue(d.residual)) {
      set("residualBasis", basis);
      set("residual", { ...residual, estimated: false });
    }
    if (d.leaseYears == null && pctValue != null) {
      const years = Object.entries(ATO_RESIDUAL_PCT).find(([, p]) => Math.abs(p - pctValue) < 0.005)?.[0];
      if (years) set("leaseYears", Number(years));
    }
    trackEvent("guided_driveaway_derived", {
      had_entered: entered != null && !enteredIsOurs,
      gap_pct: gap == null ? undefined : Math.round(gap * 1000) / 10,
    });
  }

  return (
    <Help title="Not on your quote? Work it out from the residual">
      <p style={{ margin: "0 0 12px" }}>
        Many quotes leave it out. It can be worked out from the residual (balloon) and its percentage.
      </p>

      {gst == null ? (
        <p style={{ margin: 0 }}>
          Enter the FBT base value above first. We use it to work out the GST saving.
        </p>
      ) : (
        <>
          <Choices
            label="Is the residual on your quote including or excluding GST?"
            value={basis}
            onChange={setBasis}
            options={[
              { value: "exGst", label: "Excluding GST" },
              { value: "incGst", label: "Including GST", sub: "Most quotes print this one" },
            ]}
            columns={2}
          />
          <MoneyInput
            label={`Residual value${basis === "incGst" ? " (including GST)" : basis === "exGst" ? " (excluding GST)" : ""}`}
            value={residual}
            onChange={setResidual}
            where="Type the figure exactly as printed."
          />
          <MoneyInput
            label="Residual percentage"
            value={pct}
            onChange={setPct}
            prefix=""
            suffix="%"
            placeholder="e.g. 28.13"
            hint={
              <>
                Usually the ATO minimum. Tap to fill in:
                <span className="gd-chips">
                  {Object.entries(ATO_RESIDUAL_PCT).map(([years, p]) => (
                    <button
                      key={years}
                      type="button"
                      className="gd-chip"
                      aria-pressed={moneyValue(pct) === p}
                      onClick={() => setPct({ ...emptyMoney(), text: String(p) })}
                    >
                      {p}% <span className="gd-chip__sub">{years} yr</span>
                    </button>
                  ))}
                </span>
              </>
            }
          />

          {derived != null && (
            <div className="gd-derive">
              <div className="gd-derive__result">
                Drive-away price: about <strong>{money0(derived)}</strong>
              </div>
              <div className="gd-derive__working">
                {money2(residualExGst!)} ex GST ÷ {pctValue}% + {money2(gst)} GST saving
              </div>
              {gap != null && gap > AGREE_WITHIN && (
                <p className="gd-derive__flag">
                  That's {money0(derived - entered!)} more than the {money0(entered!)} you entered. When the
                  residual implies a higher price, something besides the car is usually being financed, such as
                  accessories or insurance products. Check the amount financed on your quote.
                </p>
              )}
              {gap != null && gap < -AGREE_WITHIN && (
                <p className="gd-derive__flag">
                  That's {money0(entered! - derived)} less than the {money0(entered!)} you entered. Some providers
                  set the residual on a slightly different base, or the residual may be above the minimum. Check
                  the figures, and keep the price from the dealer's invoice if you have it.
                </p>
              )}
              {gap != null && Math.abs(gap) <= AGREE_WITHIN && (
                <p className="gd-derive__ok">That matches the price you entered.</p>
              )}
              <Button variant="secondary" size="sm" onClick={applyFigure}>
                Use this figure
              </Button>
              <p className="gd-derive__fine">
                An estimate. If you have the dealer's invoice, use its drive-away price instead.
              </p>
            </div>
          )}
        </>
      )}
    </Help>
  );
}
