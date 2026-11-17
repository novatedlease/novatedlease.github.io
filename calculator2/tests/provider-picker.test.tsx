import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, missingForStep, type GuidedDraft } from "../src/guided/draft";
import { GUIDED_PROVIDERS, PROVIDERS, articleFor, type GuideField, type ProviderId, cropFor, exampleFor, imageSizeFor, lineLabelFor, markerFor, notOnQuote, guideFor, guideIsOld, guideMayHaveChanged, pageFor, shownKind, pageImagesFor, pointersFor, seenLabel, showResidualDriveawayHelper, templateFor } from "../src/guided/providerGuide";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.gtag;
});

const KEY = "nlc2-guided-draft-v3";

function quoteDraft(): GuidedDraft {
  return { ...emptyDraft(), hasQuote: true, vehicleType: "EV", vehicleCondition: "New" };
}

function on(step: "intro" | "price" | "lease" | "payment", d: GuidedDraft | Record<string, unknown>) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ draft: d, step, visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
  );
  render(<App />);
}

const saved = () => JSON.parse(window.localStorage.getItem(KEY)!).draft as GuidedDraft;
const picker = () => screen.getByLabelText(/Who is your quote from/) as HTMLSelectElement;

describe("a or an before a provider name", () => {
  test.each([
    ["Oly", "an"], ["SG Fleet", "an"], ["ORIX", "an"], ["Easi (EasiFleet)", "an"],
    ["Maxxia", "a"], ["Smart Leasing", "a"], ["Novated Lease Australia (NLA)", "a"],
  ])("%s takes %s", (label, expected) => {
    expect(articleFor(label)).toBe(expected);
  });
});

describe("provider picker", () => {
  test("the residual price helper appears only where the quote guide needs it", () => {
    const clear = [
      "sgfleet", "millarx", "flare", "kooya", "maxxia", "fleetpartners", "alliance",
      "easi", "autopia", "clearlease", "customfleet", "spa", "driva", "fingo",
      "toyotafleet", "simplygreen", "vehiclesolutions", "lendly", "leaselab", "nla", "insideedge",
    ] as const;
    const fallback = ["smartleasing", "oly", "remunerator", "paywise", "prosperity", "leaseexpress", "orix", "remserv", "carbon"] as const;
    for (const id of clear) expect(showResidualDriveawayHelper(id), id).toBe(false);
    for (const id of fallback) expect(showResidualDriveawayHelper(id), id).toBe(true);
    expect(showResidualDriveawayHelper(null)).toBe(true);
    expect(showResidualDriveawayHelper("other")).toBe(true);
    expect([...clear, ...fallback].sort()).toEqual(GUIDED_PROVIDERS.map((p) => p.id).sort());

    on("price", { ...quoteDraft(), provider: "autopia" });
    expect(screen.queryByText(/Not on your quote\? Work it out from the residual/)).toBeNull();
    cleanup();
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.getByText(/Not on your quote\? Work it out from the residual/)).toBeTruthy();
  });

  test("is optional, on the first screen once the reader has a quote, and the choice is saved", () => {
    on("intro", quoteDraft());
    expect(picker().value).toBe("");
    expect(screen.getByText(/The company named at the top of your quote/)).toBeTruthy();
    expect(missingForStep("intro", saved()).join()).not.toMatch(/quote from/);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().provider).toBe("sgfleet");
    expect(screen.getByText(/We'll show you where each figure is on an SG Fleet quote/)).toBeTruthy();
  });

  test("Other has a useful next step, while an older guide names its date", () => {
    on("intro", quoteDraft());
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(screen.getByText(/The general hints work for any quote/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tell us who it's from" }).getAttribute("href"))
      .toBe("/about/contact/#quote-layout-feedback");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 5, 1));
    try {
      fireEvent.change(picker(), { target: { value: "insideedge" } });
      expect(screen.getByText(/Our example is from May 2026/)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  test("Smart Leasing / MillarX answer follows the named provider", () => {
    on("intro", quoteDraft());
    fireEvent.change(picker(), { target: { value: "millarx" } });
    expect(saved().smartMillarx).toBe(true);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().smartMillarx).toBe(false);
    // Back to "Other": the answer was ours, so the question is asked again
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(saved().smartMillarx).toBeNull();
  });

  test("changing provider clears a payment corrected for the previous provider", () => {
    on("intro", {
      ...quoteDraft(),
      provider: "smartleasing",
      smartMillarx: true,
      payment: { text: "400", none: false, estimated: false },
      paymentCorrected: true,
    });
    fireEvent.change(picker(), { target: { value: "millarx" } });
    expect(saved().paymentCorrected).toBe(false);
    expect(saved().payment.text).toBe("");
  });

  test("switching a corrected Smart Leasing draft to Other clears its correction", () => {
    on("intro", {
      ...quoteDraft(),
      provider: "smartleasing",
      smartMillarx: true,
      payment: { text: "400", none: false, estimated: false },
      paymentCorrected: true,
    });
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(saved().smartMillarx).toBeNull();
    expect(saved().paymentCorrected).toBe(false);
    expect(saved().payment.text).toBe("");
  });

  test("isn't asked when exploring without a quote, and is gone from the price screen", () => {
    on("intro", { ...emptyDraft(), hasQuote: false });
    expect(screen.queryByLabelText(/Who is your quote from/)).toBeNull();
    cleanup();
    window.localStorage.clear();
    on("price", quoteDraft());
    expect(screen.queryByLabelText(/Who is your quote from/)).toBeNull();
  });

  test("lists the three most common providers first, then all providers alphabetically", () => {
    on("intro", quoteDraft());
    const groups = [...picker().querySelectorAll("optgroup")].map((g) => g.label);
    expect(groups).toEqual(["Most common", "All providers"]);
    const common = [...picker().querySelectorAll('optgroup[label="Most common"] option')].map((o) => o.textContent);
    expect(common).toEqual(["Smart Leasing", "SG Fleet", "Maxxia"]);
    const rest = [...picker().querySelectorAll('optgroup[label="All providers"] option')].map((o) => o.textContent);
    expect(rest.slice(0, -1)).toEqual([...rest.slice(0, -1)].sort((a, b) => a!.localeCompare(b!)));
    expect(rest.at(-1)).toBe("Other / not listed");
  });

  test("Smartsalary is Smart Leasing's layout: picking it selects Smart Leasing; Prosperity Smart Drive says it isn't Smart", () => {
    on("intro", quoteDraft());
    expect(screen.queryByText(/same company \(now “Smart”\)/)).toBeNull();
    fireEvent.change(picker(), { target: { value: "smartsalary" } });
    expect((picker() as HTMLSelectElement).value).toBe("smartleasing");
    expect(screen.getByText(/Smartsalary and Smart Leasing are the same company \(now “Smart”\), with the same quote layout\./)).toBeTruthy();
    fireEvent.change(picker(), { target: { value: "prosperity" } });
    expect(screen.getByText(/Prosperity Smart Drive isn't part of Smart/)).toBeTruthy();
  });

  test("a named provider hides the Smart Leasing / MillarX question", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    expect(screen.queryByText("Is your lease with Smart Leasing or MillarX?")).toBeNull();
    expect(missingForStep("payment", { ...quoteDraft(), provider: "sgfleet" }).join()).not.toMatch(/Smart Leasing/);
  });

  test("a draft saved before the picker still shows the old question with its answer", () => {
    const old = { ...quoteDraft(), smartMillarx: true } as Record<string, unknown>;
    delete old.provider;
    on("payment", old);
    expect(screen.getByText("Is your lease with Smart Leasing or MillarX?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Yes/ }).getAttribute("aria-pressed")).toBe("true");
    expect(missingForStep("payment", { ...emptyDraft(), smartMillarx: null }).join()).toMatch(/Smart Leasing or MillarX/);
  });
});

describe("correction callout with a named provider", () => {
  const payDraft = (provider: GuidedDraft["provider"], smartMillarx: boolean | null) => ({
    ...quoteDraft(),
    provider,
    smartMillarx,
    leaseYears: 5,
  });
  const toggle = () => screen.queryByRole("button", { name: "Smart Leasing" }) ?? screen.queryByRole("button", { name: "MillarX" });

  test("MillarX: the callout names MillarX and the tool has no provider toggle", () => {
    on("payment", payDraft("millarx", true));
    expect(screen.getByText("You need to correct your MillarX payment")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(toggle()).toBeNull();
    expect(screen.getByRole("dialog").textContent).toMatch(/MillarX derives your regular payment/);
  });

  test("Smart Leasing: the callout names Smart Leasing and the tool starts on it, without a toggle", () => {
    on("payment", payDraft("smartleasing", true));
    expect(screen.getByText("You need to correct your Smart Leasing payment")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(toggle()).toBeNull();
    expect(screen.getByRole("dialog").textContent).toMatch(/Smart Leasing derives your regular payment/);
  });

  test("no provider named: the callout names both and the tool keeps its toggle", () => {
    on("payment", payDraft(null, true));
    expect(screen.getByText("You need to correct your Smart Leasing / MillarX payment")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(screen.getByRole("button", { name: "MillarX" })).toBeTruthy();
  });
});

describe("FBT base value not printed", () => {
  const GST_LINES: [ProviderId, string][] = [
    ["millarx", "Look for “FBT Base Value”. Not printed? Multiply “Less: GST credit” by 11, unless it's the maximum."],
  ];

  test("RemServ's full quote shows FBT Base Value, while the short estimate needs a fallback", () => {
    const [p] = pointersFor("remserv", "baseValue");
    expect(p.text).toContain("Vehicle FBT Base Value");
    expect(p.more).toContain("GST savings on car");
    expect(p.more).toContain("$6,353");
    expect(p.example?.image).toBe("/assets/images/quote-guide/remserv/field-alt-baseValue.webp");
  });

  test("lendly: GST credit × 11, or Taxable Value × 5 when the credit is at the maximum", () => {
    const [p] = pointersFor("lendly", "baseValue");
    expect(p.notShown).toBe(true);
    expect(p.text).toBe("Find “GST Tax Credit”. Less than $6,353? Multiply it by 11. At $6,353, the maximum? Multiply “Taxable Value” by 5.");
    expect(existsSync(resolve(__dirname, "../../docs", p.example!.image.slice(1)))).toBe(true);
  });

  test.each(GST_LINES)("%s: printed value first or GST credit × 11, with the cap in the tooltip and a picture that exists", (id, text) => {
    const [p] = pointersFor(id, "baseValue");
    expect(p.notShown).toBe(true);
    expect(p.text).toBe(text);
    expect(p.more).toMatch(/\$6,353/);
    expect(p.more).toMatch(/drive-away price and subtract stamp duty, rego and CTP/);
    expect(p.example?.image).toBe(`/assets/images/quote-guide/${id}/field-gst-credit.webp`);
    expect(existsSync(resolve(__dirname, "../../docs", p.example!.image.slice(1)))).toBe(true);
  });

  test("Oly: the uncapped “GST” line × 11, never the capped saving, and no cap caveat (UX 19)", () => {
    const [p] = pointersFor("oly", "baseValue");
    expect(p.text).toBe("Can't find it on your Oly quote? Multiply the “GST” line in the price breakdown by 11. Don't use “Estimated GST savings upfront”.");
    expect(p.more).toBe("Or add “Vehicle list price” and “Dealer delivery charges”, then add 10%.");
    expect(p.example?.image).toBe("/assets/images/quote-guide/oly/field-gst-credit.webp");
  });

  test("MillarX fees: some quotes have a monthly fee, the BYO finance-only one has none", () => {
    const [p] = pointersFor("millarx", "fees");
    expect(p.text).toBe("Some MillarX quotes show a management fee per month. Enter it if yours does. The BYO finance-only quote has none.");
    expect(p.text).not.toMatch(/Older/);
  });

  test("MillarX sends readers to the salary packager, not MillarX", () => {
    const [p] = pointersFor("millarx", "baseValue");
    expect(p.more).toMatch(/ask your salary packager/);
    expect(p.more).not.toMatch(/Ask MillarX/i);
  });
});

const FIELDS_FOR_CAPTIONS: GuideField[] = ["baseValue", "driveaway", "defer", "docFee", "financedInsurance", "residual", "payment", "luxAdj", "running", "insurance", "fees"];

describe("provider pointers", () => {
  test("pointer text reads well out of context: no here, above or below", () => {
    // The same text is reused in the provider articles, where "here" has nothing to point at.
    for (const { id } of GUIDED_PROVIDERS) {
      for (const field of FIELDS_FOR_CAPTIONS) {
        for (const p of pointersFor(id, field)) expect(p.text, `${id}/${field}`).not.toMatch(/\b(here|above|below)\b/i);
      }
    }
  });

  test("article intros don't state their own review month", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      const article = readFileSync(resolve(__dirname, `../../new-site/src/content/docs/start-here/how-to-read-${id}-quote.md`), "utf8");
      const body = article.replace(/<!-- quote-review:begin -->[\s\S]*?<!-- quote-review:end -->/, "");
      expect(body, id).not.toMatch(/reviewed in (January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d/);
    }
  });

  test("articles list the same can't-find-it lines as Guided", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      const article = readFileSync(resolve(__dirname, `../../new-site/src/content/docs/start-here/how-to-read-${id}-quote.md`), "utf8");
      const section = article.split("<!-- provider-missing:begin -->")[1]?.split("<!-- provider-missing:end -->")[0] ?? "";
      const missing = FIELDS_FOR_CAPTIONS.flatMap((field) => pointersFor(id, field)).filter((p) => p.kind === "missing");
      for (const p of missing) {
        expect(section, `${id}/${p.field}`).toContain(p.text);
        if (p.example) expect(section, `${id}/${p.field} picture`).toContain(p.example.image);
      }
      expect((section.match(/^- \*\*/gm) ?? []).length, id).toBe(missing.length);
    }
  });

  test("provider lines and checks don't generalise from a few quotes", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      for (const field of FIELDS_FOR_CAPTIONS) {
        for (const p of pointersFor(id, field)) expect(p.text, `${id}/${field}`).not.toMatch(/\b(usually|often|always)\b/i);
      }
    }
  });

  test("pointer main text is plain sentences: no dashes, semicolons, abbreviations or app names outside quoted labels", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      for (const field of FIELDS_FOR_CAPTIONS) {
        for (const p of pointersFor(id, field)) {
          const own = p.text.replace(/“[^”]*”/g, "“”");
          expect(own, `${id}/${field}`).not.toMatch(/—|;|\bincl\b|\bGuided\b/);
        }
      }
    }
  });

  test("each picture has one caption, with no date and one enlarge hint", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      for (const field of FIELDS_FOR_CAPTIONS) {
        for (const p of pointersFor(id, field)) {
          const caption = (p.example ?? exampleFor(id, field))?.caption;
          if (!caption) continue;
          expect(caption, `${id}/${field}`).not.toMatch(/Tap the image|Checked [A-Z][a-z]{2} \d{4}/);
        }
      }
    }
  });

  test("whole-page view can name the number of every line Guided shows as a crop", () => {
    // Crops mark the line with a tick; the whole page keeps the article's numbers, so the caption
    // says which number to look for.
    expect(lineLabelFor("oly", "driveaway")).toBe("2");
    expect(lineLabelFor("millarx", "payment")).toBe("7a or 7b");
    expect(lineLabelFor("sgfleet", "payment")).toBe("7b");
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      for (const field of FIELDS_FOR_CAPTIONS) {
        const crop = cropFor(id, field);
        if (!crop || exampleFor(id, field) || !markerFor(id, field)) continue;
        expect(lineLabelFor(id, field), `${id}/${field}`).toMatch(/^\d+[ab]?( or \d+[ab]?)*$/);
      }
    }
  });

  test("special example captions say how the line is marked: its number, or a tick on a crop", () => {
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      for (const field of FIELDS_FOR_CAPTIONS) {
        const example = exampleFor(id, field);
        if (example) expect(example.caption, `${id}/${field}`).toMatch(example.image.includes("/field-") ? /is ticked/ : /marked \d+/);
      }
    }
  });

  test("payment pointers only give a GST answer when the example's label or footnote supports it", () => {
    // The payment's GST basis can differ between employers on one provider's quotes. A pointer may
    // only name a GST basis when it quotes a label that prints it ("If you see “… (excl GST)”").
    for (const { id } of GUIDED_PROVIDERS) {
      for (const p of pointersFor(id, "payment")) {
        if (id === "alliance") {
          expect(p.text).toContain("On this quote, GST has its own line, so choose Excluding GST");
          expect(p.more).toContain("can depend on your employer");
          continue;
        }
        const labels = p.text.match(/“[^”]*”/g) ?? [];
        if (labels.some((l) => /GST/i.test(l))) continue; // the quote's own label states the basis
        // Quoted labels and capitalised column names ("EXCL GST") are printed on the reader's quote.
        const unlabelled = p.text.replace(/“[^”]*”/g, "").replace(/\b[A-Z]{3,} GST\b/g, "");
        expect(unlabelled, `${id}: ${p.text}`).not.toMatch(/\b(ex|excl|exc|inc|incl)\.? GST\b|choose (Including|Excluding) GST|(?<!whether it )(includes|excludes) GST/i);
      }
    }
  });

  test("NLA's payment GST question explains the printed subtotal check", () => {
    phoneWidth(false);
    on("payment", { ...quoteDraft(), provider: "nla" });
    expect(screen.getByText(/On the NLA example, GST is 10% of the other “Gross fortnightly rental” lines/)).toBeTruthy();
    expect(screen.getByText(/If your table works the same way, choose Excluding GST/)).toBeTruthy();
    const show = document.querySelector<HTMLButtonElement>('[data-gst-subtotal-example="nla"]')!;
    fireEvent.click(show);
    expect(document.querySelector('.gd-provider-side svg[role="img"]')?.getAttribute("aria-label"))
      .toBe("Redacted Novated Lease Australia (NLA) quote with its GST figure boxed");
    expect(document.querySelector(".gd-split__main .gd-gst-subtotal")).toBeNull();
    expect(screen.getByText(/GST = 10% of the sum of the other rental lines above/)).toBeTruthy();
  });

  test("NLA marks its fortnightly administration fee as an annual-budget conversion trap", () => {
    const pointer = pointersFor("nla", "fees")[0];
    expect(shownKind(pointer, "nla")).toBe("trap");
    expect(pointer.text).toContain("multiply by 26, then 1.10");
    expect(pointer.more).toContain("Per year and Excluding GST");
  });

  test.each(["alliance", "easi", "clearlease", "fingo"] as const)("%s shows the verified GST row example", (provider) => {
    phoneWidth(false);
    on("payment", { ...quoteDraft(), provider });
    fireEvent.click(document.querySelector<HTMLButtonElement>(`[data-gst-subtotal-example="${provider}"]`)!);
    expect(document.querySelector('.gd-provider-side svg[role="img"]')?.getAttribute("aria-label"))
      .toBe(`Redacted ${provider === "easi" ? "Easi (EasiFleet)" : provider === "alliance" ? "Alliance Leasing" : provider === "clearlease" ? "Clear Lease" : "Fingo"} quote with its GST figure boxed`);
  });

  test("NLA's GST illustration opens inline only at phone width", () => {
    phoneWidth(true);
    on("payment", { ...quoteDraft(), provider: "nla" });
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-gst-subtotal-example="nla"]')!);
    expect(document.querySelector('.gd-split__main .gd-gst-subtotal svg[role="img"]')).toBeTruthy();
    expect(document.querySelector(".gd-provider-side")).toBeNull();
  });

  const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  test("payment pointer comes before the period and GST questions it answers", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const pointer = document.querySelector('.gd-pointers[data-field="payment"]')!;
    expect(pointer).toBeTruthy();
    expect(before(pointer, screen.getByText("How does your quote show the payment?"))).toBe(true);
  });

  test("residual pointer sits under the GST question it answers, in place of the generic hint (UX 16, 17)", () => {
    on("lease", { ...quoteDraft(), provider: "maxxia", smartMillarx: false });
    const residual = document.querySelector('.gd-pointers[data-field="residual"]')!;
    expect(residual).toBeTruthy();
    expect(before(screen.getByText("On your quote, is the residual (balloon) value"), residual)).toBe(true);
    expect(screen.queryByText(/This is the most common slip/)).toBeNull();
  });

  test("with no provider the generic residual GST hint stays", () => {
    on("lease", { ...quoteDraft(), provider: null, smartMillarx: false });
    expect(screen.getByText(/This is the most common slip/)).toBeTruthy();
  });

  test("warns when a quote layout has not been checked for over six months", () => {
    const now = new Date(2026, 10, 12);
    expect(guideMayHaveChanged("2026-05", now)).toBe(false);
    expect(guideMayHaveChanged("2026-04", now)).toBe(true);
  });

  test("a guide over twelve months old shows its traps as plain lines (R15)", () => {
    const now = new Date(2026, 10, 14);
    expect(guideIsOld("2025-11", now)).toBe(false);
    expect(guideIsOld("2025-10", now)).toBe(true);
    const docFee = pointersFor("fleetpartners", "docFee")[0];
    expect(docFee.kind).toBe("trap");
    expect(shownKind(docFee, "fleetpartners", new Date(2027, 11, 15))).toBe("locate");
    expect(shownKind(docFee, "fleetpartners", now)).toBe("trap");
    expect(shownKind(pointersFor("maxxia", "defer")[0], "maxxia", new Date(2027, 11, 15))).toBe("missing");
    expect(shownKind(pointersFor("oly", "driveaway")[0], "oly", now)).toBe("trap");
  });

  test("each named provider has dated pointers and a recorded quote source", () => {
    for (const provider of GUIDED_PROVIDERS) {
      const guide = guideFor(provider.id);
      expect(guide, provider.id).not.toBeNull();
      expect(guide!.sources.length, provider.id).toBeGreaterThan(0);
      expect(guide!.pointers.length, provider.id).toBeGreaterThan(0);
      expect(guide!.seen, provider.id).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
    }
  });

  test("each named provider explains where to get the drive-away price", () => {
    for (const provider of GUIDED_PROVIDERS) {
      expect(pointersFor(provider.id, "driveaway").length, provider.id).toBeGreaterThan(0);
    }
  });

  test("new providers have evidence-backed pointers on the appropriate fields", () => {
    expect(pointersFor("autopia", "baseValue")[0].text).toMatch(/base price/i);
    expect(pointersFor("customfleet", "luxAdj")[0].text).toMatch(/Non-Deductible Depreciation/);
    expect(pointersFor("leaselab", "payment")[0].text).toMatch(/Weekly or Fortnightly Allowances/);
    expect(pointersFor("spa", "driveaway")[0].text).toMatch(/excluding GST/);
  });

  test("SG Fleet's deferral pointer sits under the deferral question", () => {
    on("lease", { ...quoteDraft(), provider: "sgfleet" });
    const pointer = screen.getByText(/payable as 34 payments/);
    const deferField = document.querySelector('[data-field="monthsDeferred"]')!;
    // The pointer comes straight after the deferral question
    expect(deferField.nextElementSibling?.contains(pointer)).toBe(true);
    expect(screen.getAllByText(/As seen on SG Fleet quotes, Nov 2026/).length).toBeGreaterThan(0);
  });

  // These tests cover the phone layout, where "Show me" opens the picture inside the pointer box.
  // (jsdom has no matchMedia, which Guided reads as a wide screen.)
  function phoneWidth(narrow: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: narrow && query.includes("max-width: 820px"), media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  beforeEach(() => phoneWidth(true));
  afterEach(() => { delete (window as { matchMedia?: unknown }).matchMedia; });

  test("on a wide screen, Show me puts the picture in the side panel, not in the box", () => {
    phoneWidth(false);
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const pointer = document.querySelector('.gd-pointers[data-field="payment"]')!;
    fireEvent.click(pointer.querySelector(".gd-template > button")!);
    expect(pointer.querySelector(".gd-template__body")).toBeNull();
    const side = document.querySelector(".gd-provider-side")!;
    expect(side.querySelector("strong")?.textContent).toBe("SG Fleet quote: Finance payment");
    expect(side.querySelector("img")?.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    expect(side.querySelector(".gd-template__fullpage img")?.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/redacted-quote.webp");
    expect(side.textContent).toContain("Your line is marked 7b.");
  });

  test("bare 'Show me on a … quote' links: shown on phones, hidden beside the side panel", () => {
    // The panel already follows the focused box, so on a wide screen the link would do nothing visible.
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.getByRole("button", { name: "Show me on a Smart Leasing quote" })).toBeTruthy();
    cleanup();
    phoneWidth(false);
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.queryByRole("button", { name: "Show me on a Smart Leasing quote" })).toBeNull();
    // A pointer with its own text keeps its Show me.
    expect(screen.getByText(/Can't find a drive-away total/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Show me" }).length).toBeGreaterThan(0);
  });

  test("Smart Leasing drive-away: the side panel says it isn't on the quote, rather than showing an unmarked page", () => {
    phoneWidth(false);
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    const box = document.querySelector<HTMLInputElement>('[data-field="driveaway"] input')!;
    fireEvent.focus(box);
    const side = document.querySelector(".gd-split__side")!;
    expect(side.textContent).toContain("Smart Leasing quote: Drive-away price");
    expect(side.textContent).toContain("Not shown on the Smart Leasing quotes we've seen.");
    expect(side.querySelector("img")).toBeNull();
    // Its own Show me still brings up the pages to work it out from the residual.
    fireEvent.click(document.querySelector('.gd-pointers[data-field="driveaway"] .gd-template > button')!);
    expect(side.querySelector("img")).not.toBeNull();
    expect(notOnQuote("smartleasing", "driveaway")).toBe(true);
    expect(notOnQuote("smartleasing", "baseValue")).toBe(false);
    expect(notOnQuote("sgfleet", "baseValue")).toBe(false);
  });

  test("the residual helper under drive-away moves the side panel to the residual picture", () => {
    phoneWidth(false);
    on("price", { ...quoteDraft(), provider: "smartleasing", baseValue: { text: "56756.05", none: false, estimated: false } });
    fireEvent.click(screen.getByText(/Not on your quote\? Work it out from the residual/));
    fireEvent.focus(document.querySelector<HTMLInputElement>('[data-field="residual"] input')!);
    const side = document.querySelector(".gd-split__side")!;
    expect(side.querySelector("strong")?.textContent).toMatch(/^Smart Leasing quote: Residual/);
    expect(side.querySelector("img")).not.toBeNull();
    fireEvent.focus(document.querySelector<HTMLInputElement>('[data-field="baseValue"] input')!);
    expect(side.querySelector("strong")?.textContent).toBe("Smart Leasing quote: FBT base value");
  });

  test("Smart Leasing and MillarX payment pictures say the figure goes through the correction tool", () => {
    for (const provider of ["smartleasing", "millarx"] as const) {
      on("payment", { ...quoteDraft(), provider, smartMillarx: true });
      const pointer = openPicture("payment");
      expect(pointer.textContent).toContain("Don't enter it as printed: put it through the correction tool first.");
      cleanup();
    }
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    expect(openPicture("payment").textContent).not.toContain("correction tool first");
  });

  function openPicture(field: string) {
    const pointer = document.querySelector(`.gd-pointers[data-field="${field}"]`)!;
    fireEvent.click(pointer.querySelector(".gd-template > button")!);
    return pointer;
  }

  test("quote-layout feedback click records only the selected provider", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    on("price", { ...quoteDraft(), provider: "sgfleet" });
    const pointer = openPicture("baseValue");
    fireEvent.click(pointer.querySelector('a[href="/about/contact/#quote-layout-feedback"]')!);
    expect(gtag).toHaveBeenCalledWith("event", "guided_provider_feedback_click", { provider: "sgfleet" });
  });

  test("Smart Leasing stacks both redacted pages for the missing drive-away price", () => {
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.getByText(/Can't find a drive-away total/)).toBeTruthy();
    const pointer = openPicture("driveaway");
    const images = pointer.querySelectorAll<HTMLImageElement>(".gd-template__body img");
    expect([...images].map((image) => image.getAttribute("src"))).toEqual([
      "/assets/images/quote-guide/smartleasing/redacted-quote-page-1.webp",
      "/assets/images/quote-guide/smartleasing/redacted-quote.webp",
    ]);
    expect(pointer.querySelector(".gd-template__fullpage")).toBeTruthy();
  });

  test("Smart Leasing's documentation fee opens a crop of the separate terms page's clause", () => {
    on("lease", { ...quoteDraft(), provider: "smartleasing" });
    const pointer = openPicture("docFee");
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/smartleasing/field-docFee.webp");
  });

  test.each(["oly", "maxxia"] as const)("%s shows the financed first-year insurance line beside its question", (provider) => {
    phoneWidth(false);
    on("lease", { ...quoteDraft(), provider });
    const question = screen.getByText("Is the first year's insurance included in the amount financed?");
    fireEvent.focus(question.closest("[data-field]")!.querySelector("button")!);
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe(`/assets/images/quote-guide/${provider}/field-financedInsurance.webp`);
    const pointer = document.querySelector<HTMLElement>('[data-field="financedInsurance"].gd-pointers')!;
    expect(pointer.textContent).toMatch(/Don't use the renewal budget/);
  });

  test("Smart Leasing has no financed first-year insurance prompt or marked crop", () => {
    on("lease", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.queryByText("Is the first year's insurance included in the amount financed?")).toBeNull();
    expect(cropFor("smartleasing", "financedInsurance")).toBeNull();
  });

  test("RemServ shows the financed insurance line and switches to its redacted full page", () => {
    phoneWidth(false);
    on("lease", { ...quoteDraft(), provider: "remserv" });
    const question = screen.getByText("Is the first year's insurance included in the amount financed?");
    fireEvent.focus(question.closest("[data-field]")!.querySelector("button")!);
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/remserv/field-alt-financedInsurance.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/remserv/redacted-lease-breakdown.webp");
  });

  test("RemServ's summary price rows open first, with the detailed layout still available", () => {
    phoneWidth(false);
    on("price", { ...quoteDraft(), provider: "remserv" });
    const warning = screen.getByText(/Summary: scroll to “Purchase Details”/).closest(".gd-pointer")!;
    fireEvent.click(warning.querySelector("button")!);
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/remserv/field-alt-compact-driveaway.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/remserv/redacted-compact-summary.webp");
    const detailed = screen.getByText(/Detailed lease page: use “Vehicle purchase price”/).closest(".gd-pointer")!;
    fireEvent.click(detailed.querySelector("button")!);
    expect(document.querySelector<HTMLImageElement>(".gd-split__side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/remserv/field-alt-driveaway.webp");
  });

  test("SG Fleet's payment trap uses an amber box and a scrollable full-page toggle", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const pointer = openPicture("payment");
    expect(pointer.querySelector(".gd-pointer--trap")).toBeTruthy();
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    const frame = pointer.querySelector<HTMLElement>(".gd-template__fullpage")!;
    expect(frame).toBeTruthy();
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/redacted-quote.webp");
    Object.defineProperty(frame, "clientHeight", { value: 400 });
    const page = frame.querySelector("img")!;
    page.getBoundingClientRect = () => ({ width: 700, height: 1516, x: 0, y: 0, top: 0, left: 0, right: 700, bottom: 1516, toJSON: () => ({}) });
    fireEvent.load(page);
    expect(frame.scrollTop).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Just this line" }));
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
    expect(screen.getByRole("link", { name: "See the whole quote" }).getAttribute("href"))
      .toBe("/start-here/how-to-read-sgfleet-quote/");
  });

  test("SG Fleet FBT and drive-away use their marked examples", () => {
    on("price", { ...quoteDraft(), provider: "sgfleet" });
    expect(openPicture("baseValue").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/fbt-example.webp");
    expect(openPicture("driveaway").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/driveaway-example.webp");
    expect(screen.getAllByText(/As seen on SG Fleet quotes, Nov 2026/)).toHaveLength(1);
  });

  test("newly reviewed providers expose their redacted quote template", () => {
    expect(templateFor("paywise", "fees")).toBe("/assets/images/quote-guide/paywise/field-fees.webp");
    expect(templateFor("fleetpartners", "defer")).toBe("/assets/images/quote-guide/fleetpartners/field-defer.webp");
    expect(templateFor("remserv", "payment")).toBe("/assets/images/quote-guide/remserv/field-payment.webp");
  });

  test("fields use focused crops while special examples are data-driven", () => {
    expect(cropFor("maxxia", "insurance")).toBe("/assets/images/quote-guide/maxxia/field-running.webp");
    expect(cropFor("easi", "luxAdj")).toBe("/assets/images/quote-guide/easi/field-luxAdj.webp");
    expect(templateFor("sgfleet", "baseValue")).toBe(exampleFor("sgfleet", "baseValue")?.image);
    expect(templateFor("sgfleet", "driveaway")).toBe(exampleFor("sgfleet", "driveaway")?.image);
    expect(templateFor("smartleasing", "docFee")).toBe(exampleFor("smartleasing", "docFee")?.image);
  });

  test("picture-only guidance offers a link without a blue box", () => {
    on("payment", { ...quoteDraft(), provider: "maxxia", smartMillarx: false });
    const pointer = openPicture("payment");
    expect(pointer.querySelector(".gd-pointer--locate")).toBeTruthy();
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/maxxia/field-payment.webp");
  });

  test("desktop side panel follows the focused Maxxia residual field", () => {
    phoneWidth(false);
    on("lease", { ...quoteDraft(), provider: "maxxia" });
    fireEvent.focus(document.querySelector('[data-field="residual"] input')!);
    expect(document.querySelector(".gd-provider-side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/maxxia/field-residual.webp");
    expect(document.querySelector(".gd-provider-side img")?.getAttribute("alt")).toBe("Marked Maxxia quote: Residual");
    expect(document.querySelector(".gd-provider-side a")?.getAttribute("href")).toBe("/assets/images/quote-guide/maxxia/field-residual.webp");
    expect(screen.queryByText("Typical quote")).toBeNull();
  });

  test("desktop side panel shows the GST credit picture for Oly's FBT base value", () => {
    phoneWidth(false);
    on("price", { ...quoteDraft(), provider: "oly" });
    fireEvent.focus(document.querySelector('[data-field="baseValue"] input')!);
    expect(document.querySelector(".gd-provider-side img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/oly/field-gst-credit.webp");
  });

  test("locate, trap and missing pointers have distinct kinds", () => {
    expect(pointersFor("sgfleet", "payment")[0].kind).toBe("trap");
    // Plain instructions are not traps (review round 2, R7).
    // Owner, 15 Nov 2026: Maxxia/Oly insurance is entered as printed (Guided adds the financed year
    // back), and their doc fee lines are plain, so neither is a trap.
    expect(pointersFor("maxxia", "insurance")[0].kind).toBe("locate");
    expect(pointersFor("oly", "insurance")[0].kind).toBe("locate");
    expect(pointersFor("smartleasing", "docFee")[0].kind).toBe("locate");
    expect(pointersFor("maxxia", "docFee")[0].kind).toBe("locate");
    expect(pointersFor("oly", "docFee")[0].kind).toBe("locate");
    expect(pointersFor("sgfleet", "driveaway")[0].kind).toBe("locate");
    expect(pointersFor("paywise", "defer")[0].kind).toBe("missing");
    expect(markerFor("sgfleet", "payment")?.y).toBeGreaterThan(0);
  });

  test("every main provider pointer stays brief and avoids sample-focused jargon", () => {
    const fields: GuideField[] = ["baseValue", "driveaway", "term", "defer", "docFee", "financedInsurance", "residual", "payment", "luxAdj", "running", "insurance", "fees", "rate"];
    const problems = GUIDED_PROVIDERS.flatMap(({ id }) => fields.flatMap((field) => pointersFor(id, field)
      .filter(({ text }) => text.length > 140 || /sample|example|VSSS|marked \d|available pages|capitalised|\bITC\b/i.test(text))
      .map(({ text }) => `${id}/${field}: ${text}`)));
    expect(problems).toEqual([]);
  });

  test("Oly's residual and Alliance's entry fee and finance use their own marked pages", () => {
    on("lease", { ...quoteDraft(), provider: "oly" });
    expect(openPicture("residual").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/oly/residual-example.webp");
    cleanup();
    window.localStorage.clear();
    on("lease", { ...quoteDraft(), provider: "alliance" });
    expect(openPicture("docFee").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-fees.webp");
    cleanup();
    window.localStorage.clear();
    on("payment", { ...quoteDraft(), provider: "alliance" });
    const paymentPointer = openPicture("payment");
    expect(paymentPointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-budget.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    expect(paymentPointer.querySelector(".gd-template__fullpage img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-example.webp");
    fireEvent.click(screen.getByRole("button", { name: "Focused view" }));
    expect(paymentPointer.querySelector(".gd-template__crop img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-budget.webp");
    expect(exampleFor("alliance", "running")?.image).toBe("/assets/images/quote-guide/alliance/page2-budget.webp");
    expect(exampleFor("alliance", "fees")?.image).toBe("/assets/images/quote-guide/alliance/page2-budget.webp");
  });

  test("Autopia's base-value guidance opens its marked price breakdown", () => {
    on("price", { ...quoteDraft(), provider: "autopia" });
    const pointer = openPicture("baseValue");
    expect(pointer.textContent).toContain("Base price");
    expect(pointer.querySelector(".gd-template__crop img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/autopia/base-value-breakdown.webp");
    fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
    expect(pointer.querySelector(".gd-template__fullpage img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/autopia/redacted-quote.webp");
  });

  test("every field example image exists on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const [id, field] of [["oly", "residual"], ["alliance", "docFee"], ["alliance", "payment"], ["alliance", "running"], ["alliance", "fees"], ["autopia", "baseValue"]] as const) {
      const e = exampleFor(id, field)!;
      expect(fs.existsSync(path.join(__dirname, "../../docs", e.image))).toBe(true);
      expect(imageSizeFor(e.image)).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
      if (e.fullPage) {
        expect(fs.existsSync(path.join(__dirname, "../../docs", e.fullPage))).toBe(true);
        expect(imageSizeFor(e.fullPage)).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
      }
    }
  });

  test("the quote manifest covers page dimensions, field markers and GST credit crops", async () => {
    const manifest = (await import("../../docs/assets/images/quote-guide/manifest.json")).default;
    for (const id of ["millarx", "oly", "remserv", "lendly"] as const) {
      expect(imageSizeFor(`/assets/images/quote-guide/${id}/field-gst-credit.webp`)).toMatchObject({
        w: expect.any(Number), h: expect.any(Number),
      });
    }
    expect(manifest.pages.sgfleet).toMatchObject({ image: "sgfleet/redacted-quote.webp", w: expect.any(Number), h: expect.any(Number) });
    expect(manifest.markers.sgfleet.driveaway[0]).toMatchObject({ label: "2", y: expect.any(Number), h: expect.any(Number) });
    // The visible 11 on these pages is the interest rate, not an FBT base value.
    expect(markerFor("millarx", "baseValue")).toBeNull();
    expect(markerFor("orix", "baseValue")).toBeNull();
    expect(imageSizeFor(exampleFor("oly", "residual")!.image)).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
  });

  test("fields missing from a provider's example get a short what-to-do line, without a picture", () => {
    expect(pointersFor("paywise", "defer")[0]).toMatchObject({ notShown: true });
    expect(pointersFor("paywise", "defer")[0].text).toMatch(/Can’t find months deferred on your Paywise quote/);
    expect(pointersFor("fleetpartners", "baseValue")[0].text).toMatch(/“Vehicle” row.*Total column/);
    expect(templateFor("fleetpartners", "baseValue")).toBe("/assets/images/quote-guide/fleetpartners/field-baseValue.webp");
    // a field the example does show keeps its own pointer
    expect(pointersFor("sgfleet", "defer")[0].notShown).toBeUndefined();
    // RemServ's detailed quote prints an establishment fee, while the short estimate does not.
    expect(pointersFor("remserv", "docFee")[0].text).toContain("Finance Establishment Fee");
    on("lease", { ...quoteDraft(), provider: "remserv" });
    expect(screen.getByText(/Use “Finance Establishment Fee”/)).toBeTruthy();
    expect(screen.queryByText(/Can’t find months deferred/)).toBeNull();
    expect(screen.getByText("We'll assume 2")).toBeTruthy();
  });

  test("provider-specific not-shown lines are not boilerplate", () => {
    expect(pointersFor("remunerator", "fees")[0].boilerplate).toBeUndefined();
    expect(pointersFor("oly", "baseValue")[0].boilerplate).toBeUndefined();
    expect(pointersFor("toyotafleet", "defer").every((p) => !p.boilerplate)).toBe(true);
  });

  test("every crop listed exists on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fields = ["baseValue", "driveaway", "term", "defer", "docFee", "residual", "payment", "luxAdj", "running", "insurance", "fees"] as const;
    for (const p of GUIDED_PROVIDERS) {
      for (const f of fields) {
        const src = cropFor(p.id, f);
        if (src) expect(fs.existsSync(path.join(__dirname, "../../docs", src))).toBe(true);
      }
    }
  });

  test("every guide, image path and article link resolves from the shared manifest", async () => {
    const manifest = (await import("../../docs/assets/images/quote-guide/manifest.json")).default;
    const fields: GuideField[] = ["baseValue", "driveaway", "term", "defer", "docFee", "financedInsurance", "residual", "payment", "luxAdj", "running", "insurance", "fees", "rate"];
    const index = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/provider-quote-guides.md"), "utf8");
    expect(index).toContain("## Most common");
    expect(index).toContain("## All providers");
    const common = index.split("## Most common\n")[1]?.split("## All providers")[0] ?? "";
    expect([...common.matchAll(/how-to-read-(\w+)-quote/g)].map((match) => match[1]))
      .toEqual(["smartleasing", "sgfleet", "maxxia"]);
    const docsRoot = resolve(__dirname, "../../docs");
    for (const key of Object.keys(manifest.images)) {
      expect(existsSync(resolve(docsRoot, "assets/images/quote-guide", key)), key).toBe(true);
    }
    for (const { id } of GUIDED_PROVIDERS) {
      if (id === "other") continue;
      const guide = guideFor(id);
      expect(guide, id).not.toBeNull();
      expect(guide!.seen, id).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      const article = resolve(__dirname, `../../new-site/src/content/docs/start-here/how-to-read-${id}-quote.md`);
      expect(existsSync(article), article).toBe(true);
      const articleText = readFileSync(article, "utf8");
      const numberedRows = new Set(
        [...articleText.matchAll(/^\|\s*(\d+[a-z]?)(?:\s*\/\s*(\d+[a-z]?))?\s*\|/gm)]
          .flatMap((match) => [match[1], match[2]].filter(Boolean)),
      );
      const markedFields = (manifest.markers as Record<string, Record<string, { label: string }[]>>)[id] ?? {};
      for (const marks of Object.values(markedFields)) {
        for (const { label } of marks) expect(numberedRows.has(label), `${id}: unexplained marker ${label}`).toBe(true);
      }
      expect(articleText, article).toContain(`latest layout reviewed ${seenLabel(guide!.seen)}`);
      const title = articleText.match(/^title: "(How to read an? .+ novated lease quote)"$/m)?.[1];
      expect(title, article).toBeTruthy();
      expect(articleText, article).toContain(`# ${title}\n`);
      // Item 16: the article opens with the same traps Guided shows in amber, and only those.
      const trapSection = articleText.split("<!-- provider-traps:begin -->")[1]?.split("<!-- provider-traps:end -->")[0];
      expect(trapSection, article).toBeTruthy();
      expect(trapSection, article).toContain("## What catches people out on ");
      const trapTexts = fields.flatMap((field) => pointersFor(id, field)).filter((p) => p.kind === "trap").map((p) => p.text);
      for (const text of new Set(trapTexts)) expect(trapSection, `${id}: ${text}`).toContain(text);
      const trapFields = fields.filter((field) => pointersFor(id, field).some((p) => p.kind === "trap"));
      expect((trapSection!.match(/^- \*\*/gm) ?? []).length, id).toBe(trapFields.length);
      expect(index, id).toContain(`/start-here/how-to-read-${id}-quote/`);
      const paths = [pageFor(id), ...pageImagesFor(id), ...fields.flatMap((field) => [cropFor(id, field), templateFor(id, field), exampleFor(id, field)?.image])];
      for (const src of paths.filter((path): path is string => !!path)) {
        expect(existsSync(resolve(docsRoot, src.slice(1))), src).toBe(true);
        expect(imageSizeFor(src), src).not.toBeNull();
      }
    }
  });

  test("migrated Flare article rows use the current Guided pointer text", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-flare-quote.md"), "utf8");
    expect(article).toContain(`| 2 | Total on-road price | ${pointersFor("flare", "driveaway")[0].text} |`);
    expect(article).toContain(`| 7 | Finance, in Budgeted running costs | ${pointersFor("flare", "payment")[0].text} |`);
    expect(article).not.toContain("Finance payment, excluding GST; use the printed pay frequency.");
  });

  test("SG Fleet's article uses its current price and payment pointers", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-sgfleet-quote.md"), "utf8");
    for (const field of ["baseValue", "driveaway", "payment"] as const) {
      expect(article).toContain(pointersFor("sgfleet", field)[0].text);
    }
    expect(article).not.toContain("Enter the per-pay Lease rental with your pay period, ex GST");
  });

  test("Maxxia's article keeps financed insurance separate from the fee", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-maxxia-quote.md"), "utf8");
    expect(article).toContain(pointersFor("maxxia", "docFee")[0].text);
    expect(article).toContain(pointersFor("maxxia", "insurance")[0].text);
    expect(article).toContain("| 5 | Documentation fee | **Financier's Establishment Fee** |");
    expect(article).not.toContain("| 5 | Documentation fee and financed insurance");
    expect(article).not.toContain("Add the two and enter the total");
  });

  test("Oly's article keeps the financed insurance in Guided's separate question", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-oly-quote.md"), "utf8");
    expect(article).toContain(pointersFor("oly", "docFee")[0].text);
    expect(article).toContain("| 5 | Financier's Establishment fee |");
    expect(article).toContain("First year Comprehensive Insurance");
    expect(article).not.toContain("Documentation fee: add the two and enter the total");
  });

  test("MillarX payment rows do not assume one GST basis", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-millarx-quote.md"), "utf8");
    expect(article).toContain(pointersFor("millarx", "payment")[0].text);
    expect(article).toContain("Check the payment's GST heading and footnotes");
    expect(article).not.toMatch(/per (month|fortnight), ex GST/);
  });

  test("Easi's article accepts matching monthly and fortnightly finance figures", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-easi-quote.md"), "utf8");
    expect(article).toContain(pointersFor("easi", "payment")[0].text);
    expect(article).toContain(pointersFor("easi", "driveaway")[0].text);
    expect(article).toContain("https://support.easifleet.com.au/novated-finance-schedule");
    expect(article).toContain("total paid is the same");
    expect(article).not.toContain("Not this one: it is paid fewer times");
    expect(article).not.toContain("Finance payment, *Per fortnight*, excluding GST");
  });

  test("Remunerator's article uses its yearly payment and deferral pointers", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-remunerator-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "payment"] as const)
      expect(article).toContain(pointersFor("remunerator", field)[0].text);
    expect(article).toContain("Lease Payment (excl GST), under Annual Car Expenses");
  });

  test("Driva's article separates the numbered example from the other price layout", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-driva-quote.md"), "utf8");
    for (const field of ["driveaway", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("driva", field)[0].text);
    expect(article).toContain("latest layout reviewed Nov 2026");
    expect(article).toContain("Checked against 3 quote examples");
    expect(article).toContain("https://www.reddit.com/gallery/1w1ejpj");
    expect(article).toContain("Those two labels do not appear together on the numbered example above.");
  });

  test("Fingo's article distinguishes its discounted price and GST subtotal", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-fingo-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "payment"] as const)
      expect(article).toContain(pointersFor("fingo", field)[0].text);
    expect(article).toContain("GST as a separate line below the finance subtotal");
  });

  test("Lendly's article uses its current drive-away trap and October review date", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-lendly-quote.md"), "utf8");
    expect(article).toContain(pointersFor("lendly", "driveaway")[0].text);
    expect(article).toContain("latest layout reviewed Oct 2026");
    expect(article).not.toContain("reviewed in November 2026");
  });

  test("SPA's article and Guided agree on the full drive-away price", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-spa-quote.md"), "utf8");
    for (const field of ["baseValue", "driveaway", "defer"] as const)
      expect(article).toContain(pointersFor("spa", field)[0].text);
    expect(article).toContain("On Queensland Government layouts");
    expect(pointersFor("spa", "driveaway")[0].text).toContain("Total Drive Away Price");
  });

  test("Paywise's payment and fee rows keep their package-total and period warnings", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-paywise-quote.md"), "utf8");
    expect(article).toContain(pointersFor("paywise", "payment")[0].text);
    expect(article).toContain(pointersFor("paywise", "fees")[0].text);
    expect(article).toContain("not the package total");
    expect(article).toContain("using the quote's period");
  });

  test("RemServ's article covers the net-of-residual summary as well as the detailed layout", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-remserv-quote.md"), "utf8");
    const [summary, detailed] = pointersFor("remserv", "driveaway");
    expect(summary.text).toContain("Purchase Details");
    expect(summary.text).toContain("Ask about gaps");
    expect(summary.more).toContain("Total Amount Financed");
    expect(summary.more).toContain("exceeds the visible rows in both summary examples");
    expect(summary.example?.image).toBe("/assets/images/quote-guide/remserv/field-alt-compact-driveaway.webp");
    expect(imageSizeFor(summary.example!.image)).toEqual({ w: 880, h: 730 });
    expect(detailed.kind).toBe("locate");
    expect(detailed.example?.image).toBe("/assets/images/quote-guide/remserv/field-alt-driveaway.webp");
    expect(article).toContain(pointersFor("remserv", "residual")[0].text);
    expect(article).toContain(pointersFor("remserv", "payment")[0].text);
    expect(article).toContain("per fortnight");
    expect(article).toContain("Checked against 4 quote examples");
    expect(article).toContain("1x6eio8/gwm_ora_5_ultra_quote_check");
    expect(article).toContain("redacted-net-finance.webp");
    expect(article).toContain("field-alt-compact-driveaway.webp");
    expect(article).toContain("this post does not establish the drive-away price");
    expect(article).toContain("Neither “Vehicle Cost” nor “Total Vehicle Costs” is a confirmed drive-away price");
    expect(article).toContain("add “Residual Value” **as printed** to “Total Amount Financed”");
    expect(article).toContain("do not divide only the residual by 1.1");
    expect(article).toContain("do not add first-year insurance to “Total Vehicle Costs” again");
    expect(article).not.toContain("enter “Vehicle Cost” unchanged");
    expect(article).toContain("redacted-summary-table.webp");
    expect(article).toContain("redacted-lease-breakdown.webp");
    expect(article).toContain("redacted-deductions.webp");
    expect(article).toContain("1st year Comprehensive Insurance");
    expect(article).not.toContain("we assume ex GST");
  });

  test("Simplygreen's price, deferral and payment rows follow Guided", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-simplygreen-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "payment"] as const)
      expect(article).toContain(pointersFor("simplygreen", field)[0].text);
    expect(article).toContain("Total Lease Cost, per fortnight");
    expect(article).toContain("Contingency Budget\" is a refundable buffer");
    expect(pointersFor("simplygreen", "defer")[0].text).not.toContain("No. of Payments 34");
  });

  test("LeaseLab's payment pointer matches its weekly or fortnightly ex-GST table row", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-leaselab-quote.md"), "utf8");
    for (const field of ["residual", "payment"] as const)
      expect(article).toContain(pointersFor("leaselab", field)[0].text);
    expect(article).toContain('"Weekly Allowances" (or "Fortnightly Allowances") … "Budgeted Allowance (ex GST)"');
    expect(article).toContain("Roadside goes with Servicing");
    expect(article).toContain("right-hand savings tile near the top");
    expect(article).toContain("Vehicle Information");
    expect(templateFor("leaselab", "driveaway")).toBe("/assets/images/quote-guide/leaselab/field-driveaway.webp");
  });

  test("LeaseExpress's FBT, residual and payment rows follow Guided", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-leaseexpress-quote.md"), "utf8");
    for (const field of ["baseValue", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("leaseexpress", field)[0].text);
    expect(article).toContain("work out the drive-away price in Guided mode");
    expect(article).toContain("Not on your quote? Work it out from the residual");
    expect(article).toContain("Insurance Uplift goes with insurance");
  });

  test("ORIX's residual row follows Guided while fee and GST footnotes remain", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-orix-quote.md"), "utf8");
    expect(article).toContain(pointersFor("orix", "residual")[0].text);
    expect(article).toContain("It's capitalised into the lease rental");
    expect(article).toContain("Unless clearly stated otherwise … exclusive of GST");
  });

  test("NLA's vehicle-price components and fortnightly payment follow Guided", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-nla-quote.md"), "utf8");
    for (const field of ["baseValue", "driveaway", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("nla", field)[0].text);
    expect(article).toContain("Price (ex GST), GST, stamp duty, registration and CTP");
    expect(article).toContain("Keep the **reduction to your take-home pay** out");
  });

  test("Toyota Fleet's numbered table stays whole and preserves the fee GST caveat", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-toyotafleet-quote.md"), "utf8");
    for (const field of ["driveaway", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("toyotafleet", field)[0].text);
    expect(article).toMatch(/\| 7 \|[^\n]+\n\| 8 \|[^\n]+\n\| 9 \|/);
    expect(article).toContain("noting the printed GST basis");
    expect(article).toContain("The schedule doesn't state a deferral");
  });

  test("Custom Fleet's price, luxury adjustment and management fees follow Guided", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-customfleet-quote.md"), "utf8");
    for (const field of ["driveaway", "luxAdj", "fees"] as const)
      expect(article).toContain(pointersFor("customfleet", field)[0].text);
    expect(article).toContain("pick one column and the matching period; ex GST");
    expect(article).not.toContain('Roadside Assistance and Accident Management are "Included in Lease Rental"');
  });

  test("Vehicle Solutions keeps both fortnightly GST payment choices", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-vehiclesolutions-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("vehiclesolutions", field)[0].text);
    expect(article).toContain("| 7a | Finance lease, FORTNIGHTLY EXCL GST column |");
    expect(article).toContain("| 7b | Finance lease, FORTNIGHTLY INCL GST column |");
    expect(pointersFor("vehiclesolutions", "defer")[0].text).not.toContain("2 MONTHS DEFERRED");
  });

  test("FleetPartners retains its split cost and fee treatment", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-fleetpartners-quote.md"), "utf8");
    for (const field of ["driveaway", "defer"] as const)
      expect(article).toContain(pointersFor("fleetpartners", field)[0].text);
    expect(article).toContain("60 lease months minus 58 payment months");
    expect(article).toContain("check how brokerage is handled");
    expect(article).toContain("it's charged every month");
    expect(article).toContain("Do not enter **Total lease cost**");
  });

  test("Alliance's footnote and two differently labelled payment examples stay in the article", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-alliance-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "payment", "running"] as const)
      expect(article).toContain(pointersFor("alliance", field)[0].text);
    expect(pointersFor("alliance", "fees")).toEqual([]);
    expect(exampleFor("alliance", "fees")?.image).toBe("/assets/images/quote-guide/alliance/page2-budget.webp");
    expect(article).toContain("Finance Payment), fortnightly | This page 3 figure includes GST under footnote 5");
    expect(article).toContain("Finance, under Budgeted Running Costs | Choose “Finance” under “Budgeted Running Costs” on page 2.");
    expect(article).toContain("Entry Fee, under Novated Lease Fees");
  });

  test("Autopia shows the printed base price but works out the GST-inclusive FBT base value", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-autopia-quote.md"), "utf8");
    for (const field of ["baseValue", "driveaway", "docFee"] as const)
      expect(article).toContain(pointersFor("autopia", field)[0].text);
    expect(article).toContain("| 1 | base price, GST and the other vehicle price lines |");
    expect(article).toContain("base-value-breakdown.webp");
    expect(article).toContain("The final **FBT base value** isn't printed on this sample");
    expect(article).toContain("**excluding GST**");
    expect(article).toContain("fringe benefit value\" in the FBT calcs is the taxable value");
  });

  test("Prosperity Smart Drive keeps its payment and employer GST credit separate", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-prosperity-quote.md"), "utf8");
    for (const field of ["payment", "running"] as const)
      expect(article).toContain(pointersFor("prosperity", field)[0].text);
    expect(article).toContain("Motor Vehicle Deductions (inc GST)");
    expect(article).toContain("Do not use the total salary deduction");
    expect(article).not.toContain("Lease per month");
  });

  test("Smart Leasing's deferral and terms fee sync without hiding its payment correction", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-smartleasing-quote.md"), "utf8");
    for (const field of ["defer", "docFee"] as const)
      expect(article).toContain(pointersFor("smartleasing", field)[0].text);
    expect(article).toContain("Both need it");
    expect(article).toContain("different customer quote from the two pages above");
    expect(article).toContain("Some Queensland Government quotes use a different template");
  });

  test("only Inside Edge and CarBon show the term on a quote picture", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const p of PROVIDERS) if (p.id !== "insideedge" && p.id !== "carbon") expect(cropFor(p.id, "term")).toBeNull();
    const dir = path.join(__dirname, "../../docs/assets/images/quote-guide");
    const left = fs.readdirSync(dir).filter((id) => fs.existsSync(path.join(dir, id, "field-term.webp")));
    expect(left.sort()).toEqual(["carbon", "insideedge"]);
  });

  test("no pointers without a named provider", () => {
    on("lease", quoteDraft());
    expect(screen.queryByText(/As seen on/)).toBeNull();
    expect(pointersFor("other", "payment")).toEqual([]);
    expect(pointersFor(null, "payment")).toEqual([]);
  });
});

describe("payment screen order", () => {
  test("the high-rate BYO note sits under the effective interest rate, not under the amount", () => {
    on("payment", {
      ...quoteDraft(),
      driveaway: { text: "60000", none: false, estimated: false },
      baseValue: { text: "55000", none: false, estimated: false },
      leaseYears: 5,
      monthsDeferred: 2,
      residualBasis: "exGst",
      residual: { text: "15468", none: false, estimated: false },
      payment: { text: "560", none: false, estimated: false },
      paymentPeriod: "perFn",
      paymentBasis: "exGst",
    });
    const note = screen.getByText(/That's on the high side/);
    const rate = screen.getByText("Effective interest rate");
    expect(rate.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const gst = screen.getByText("Does the payment include or exclude GST?");
    expect(gst.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
