import { describe, expect, test } from "vitest";
import { checkProvider } from "../src/guided/checks";
import { emptyDraft, type GuidedDraft } from "../src/guided/draft";
import { PROVIDERS, type ProviderId } from "../src/guided/providerGuide";

function forProvider(provider: ProviderId | null): GuidedDraft {
  return { ...emptyDraft(), provider };
}

describe("provider-specific findings", () => {
  test.each(["sgfleet", "easi"] as const)("%s flags a monthly lease payment", (provider) => {
    const d = forProvider(provider);
    d.paymentPeriod = "perMonth";
    expect(checkProvider(d).map((f) => f.code)).toContain("provider_monthly_payment");
    d.paymentPeriod = "perFn";
    expect(checkProvider(d)).toEqual([]);
  });

  test("Remunerator flags a typed payment with a non-yearly period", () => {
    const d = forProvider("remunerator");
    d.payment.text = "7000";
    d.paymentPeriod = "perMonth";
    expect(checkProvider(d).map((f) => f.code)).toContain("provider_yearly_payment");
    d.paymentPeriod = "perYear";
    expect(checkProvider(d)).toEqual([]);
  });

  test.each(["perFn", "perMonth"] as const)("LeaseLab flags %s against its usual weekly quote", (period) => {
    const d = forProvider("leaselab");
    d.paymentPeriod = period;
    expect(checkProvider(d).map((f) => f.code)).toContain("provider_weekly_payment");
  });

  test("Smartsalary checks the GST heading without changing the answer", () => {
    const d = forProvider("smartsalary");
    d.paymentBasis = "exGst";
    expect(checkProvider(d).map((f) => f.code)).toContain("provider_payment_gst");
    expect(d.paymentBasis).toBe("exGst");
    d.paymentBasis = "incGst";
    expect(checkProvider(d)).toEqual([]);
  });

  test.each([
    ["flare", "Vehicle cost — Flare Cars driveaway cost"],
    ["oly", "Oly driveaway price"],
    ["fingo", "Your car price"],
    ["spa", "Novated lease purchase price"],
    ["driva", "Effective novated vehicle price"],
    ["lendly", "Total Price (ex. GST)"],
    ["kooya", "Price (ex. GST)"],
  ] as const)("%s names the low drive-away trap when the entered amount is below FBT base", (provider, label) => {
    const d = forProvider(provider);
    d.baseValue.text = "50000";
    d.driveaway.text = "45000";
    const findings = checkProvider(d);
    expect(findings.map((f) => f.code)).toContain("provider_driveaway_trap");
    expect(findings[0].message).toContain(label);
    expect(findings[0].level).toBe("error");
    // Descriptions are not quoted as if they were printed labels.
    expect(findings[0].message).not.toMatch(/“the dealer/);
    d.driveaway.text = "52000";
    expect(checkProvider(d)).toEqual([]);
  });

  test("other and no provider have no provider-specific findings", () => {
    for (const provider of [null, "other"] as const) {
      const d = forProvider(provider);
      d.paymentPeriod = "perMonth";
      d.paymentBasis = "exGst";
      d.baseValue.text = "50000";
      d.driveaway.text = "40000";
      expect(checkProvider(d)).toEqual([]);
    }
  });

  test("no provider check generalises from a few quotes or states a payment's GST basis as fact", () => {
    for (const { id } of PROVIDERS) {
      const d = forProvider(id);
      d.paymentPeriod = "perMonth";
      d.paymentBasis = "exGst";
      d.payment.text = "500";
      d.baseValue.text = "50000";
      d.driveaway.text = "45000";
      for (const f of checkProvider(d)) {
        expect(f.message, id).not.toMatch(/\b(usually|often|always)\b/i);
        expect(f.message, id).not.toMatch(/payment (is|includes|excludes) (ex|inc)/i);
      }
    }
  });
});
