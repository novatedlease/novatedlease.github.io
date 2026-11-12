import { afterEach, describe, expect, test, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, missingForStep, type GuidedDraft } from "../src/guided/draft";
import { PROVIDERS, type GuideField, type ProviderId, cropFor, exampleFor, imageSizeFor, markerFor, guideFor, guideMayHaveChanged, pageFor, pageImagesFor, pointersFor, seenLabel, templateFor } from "../src/guided/providerGuide";

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

describe("provider picker", () => {
  test("is optional, on the first screen once the reader has a quote, and the choice is saved", () => {
    on("intro", quoteDraft());
    expect(picker().value).toBe("");
    expect(screen.getByText(/The company named at the top of your quote/)).toBeTruthy();
    expect(missingForStep("intro", saved()).join()).not.toMatch(/quote from/);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().provider).toBe("sgfleet");
    expect(screen.getByText(/We'll show you where each figure is on a SG Fleet quote/)).toBeTruthy();
  });

  test("Other has a useful next step, while an older guide names its date", () => {
    on("intro", quoteDraft());
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(screen.getByText(/The general hints work for any quote/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tell us who it's from" }).getAttribute("href"))
      .toBe("/about/contact/#quote-layout-feedback");
    fireEvent.change(picker(), { target: { value: "leaseplan" } });
    expect(screen.getByText(/Our example is from Aug 2025/)).toBeTruthy();
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

  test("lists the five most common providers first, then all providers alphabetically", () => {
    on("intro", quoteDraft());
    const groups = [...picker().querySelectorAll("optgroup")].map((g) => g.label);
    expect(groups).toEqual(["Most common", "All providers"]);
    const common = [...picker().querySelectorAll('optgroup[label="Most common"] option')].map((o) => o.textContent);
    expect(common).toEqual(["Smart Leasing", "SG Fleet", "Maxxia", "Paywise", "Smartsalary (Smart Drive)"]);
    const rest = [...picker().querySelectorAll('optgroup[label="All providers"] option')].map((o) => o.textContent);
    expect(rest.slice(0, -1)).toEqual([...rest.slice(0, -1)].sort((a, b) => a!.localeCompare(b!)));
    expect(rest.at(-1)).toBe("Other / not listed");
  });

  test("picking Smart Leasing or Smartsalary explains they use different layouts", () => {
    on("intro", quoteDraft());
    expect(screen.queryByText(/related companies, but their quotes use different/)).toBeNull();
    fireEvent.change(picker(), { target: { value: "smartsalary" } });
    expect(screen.getByText(/related companies, but their quotes use different/)).toBeTruthy();
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
    expect(screen.getByText("You need to correct your MillarX payment first")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(toggle()).toBeNull();
    expect(screen.getByRole("dialog").textContent).toMatch(/MillarX derives your regular payment/);
  });

  test("Smart Leasing: the callout names Smart Leasing and the tool starts on it, without a toggle", () => {
    on("payment", payDraft("smartleasing", true));
    expect(screen.getByText("You need to correct your Smart Leasing payment first")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(toggle()).toBeNull();
    expect(screen.getByRole("dialog").textContent).toMatch(/Smart Leasing derives your regular payment/);
  });

  test("no provider named: the callout names both and the tool keeps its toggle", () => {
    on("payment", payDraft(null, true));
    expect(screen.getByText("You need to correct your Smart Leasing / MillarX payment first")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open the correction tool" }));
    expect(screen.getByRole("button", { name: "MillarX" })).toBeTruthy();
  });
});

describe("FBT base value not printed", () => {
  const GST_LINES: [ProviderId, string][] = [
    ["millarx", "Can't find it on your MillarX quote? Multiply “Less: GST credit” by 11."],
    ["oly", "Can't find it on your Oly quote? Multiply the “GST” line by 11."],
    ["remserv", "Can't find it on your RemServ quote? Multiply “GST savings on car” by 11."],
    ["lendly", "Can't find it on your Lendly quote? Multiply “GST Tax Credit” by 11."],
  ];

  test.each(GST_LINES)("%s: GST credit × 11, with the cap in the tooltip and a picture that exists", (id, text) => {
    const [p] = pointersFor(id, "baseValue");
    expect(p.notShown).toBe(true);
    expect(p.text).toBe(text);
    expect(p.more).toMatch(/\$6,353, the most allowed/);
    expect(p.more).toMatch(/drive-away price and subtract stamp duty, rego and CTP/);
    expect(p.example?.image).toBe(`/assets/images/quote-guide/${id}/field-gst-credit.webp`);
    expect(existsSync(resolve(__dirname, "../../docs", p.example!.image.slice(1)))).toBe(true);
  });

  test("MillarX fees: some quotes have a monthly fee, the BYO finance-only one has none", () => {
    const [p] = pointersFor("millarx", "fees");
    expect(p.text).toBe("Some MillarX quotes show a management fee per month. Enter it here if yours does. The BYO finance-only quote has none.");
    expect(p.text).not.toMatch(/Older/);
  });

  test("MillarX sends readers to the salary packager, not MillarX", () => {
    const [p] = pointersFor("millarx", "baseValue");
    expect(p.more).toMatch(/ask your salary packager/);
    expect(p.more).not.toMatch(/Ask MillarX/i);
  });
});

describe("provider pointers", () => {
  test("no payment pointer tells the reader which GST answer to choose", () => {
    // The payment's GST basis can differ between employers on one provider's quotes. A pointer may
    // only name a GST basis when it quotes a label that prints it ("If you see “… (excl GST)”").
    for (const { id } of PROVIDERS) {
      for (const p of pointersFor(id, "payment")) {
        const labels = p.text.match(/“[^”]*”/g) ?? [];
        if (labels.some((l) => /GST/i.test(l))) continue; // the quote's own label states the basis
        // Quoted labels and capitalised column names ("EXCL GST") are printed on the reader's quote.
        const unlabelled = p.text.replace(/“[^”]*”/g, "").replace(/\b[A-Z]{3,} GST\b/g, "");
        expect(unlabelled, `${id}: ${p.text}`).not.toMatch(/\b(ex|excl|exc|inc|incl)\.? GST\b|choose (Including|Excluding) GST|(?<!whether it )(includes|excludes) GST/i);
      }
    }
  });

  const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  test("payment pointer comes before the period and GST questions it answers", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const pointer = document.querySelector('.gd-pointers[data-field="payment"]')!;
    expect(pointer).toBeTruthy();
    expect(before(pointer, screen.getByText("How does your quote show the payment?"))).toBe(true);
  });

  test("residual pointer sits between the residual amount and its GST question", () => {
    on("lease", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const residual = document.querySelector('.gd-pointers[data-field="residual"]')!;
    expect(residual).toBeTruthy();
    expect(before(screen.getByLabelText(/residual/i, { selector: "input" }), residual)).toBe(true);
    expect(before(residual, screen.getByText("On your quote, is the residual (balloon) value"))).toBe(true);
  });

  test("warns when a quote layout has not been checked for over six months", () => {
    const now = new Date(2026, 10, 12);
    expect(guideMayHaveChanged("2026-05", now)).toBe(false);
    expect(guideMayHaveChanged("2026-04", now)).toBe(true);
  });

  test("each named provider has dated pointers and a recorded quote source", () => {
    for (const provider of PROVIDERS.filter((p) => p.id !== "other")) {
      const guide = guideFor(provider.id);
      expect(guide, provider.id).not.toBeNull();
      expect(guide!.sources.length, provider.id).toBeGreaterThan(0);
      expect(guide!.pointers.length, provider.id).toBeGreaterThan(0);
      expect(guide!.seen, provider.id).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
    }
  });

  test("each named provider explains where to get the drive-away price", () => {
    for (const provider of PROVIDERS.filter((p) => p.id !== "other")) {
      expect(pointersFor(provider.id, "driveaway").length, provider.id).toBeGreaterThan(0);
    }
  });

  test("new providers have evidence-backed pointers on the appropriate fields", () => {
    expect(pointersFor("autopia", "baseValue")[0].text).toMatch(/base price/);
    expect(pointersFor("customfleet", "luxAdj")[0].text).toMatch(/Non-Deductible Depreciation/);
    expect(pointersFor("leaselab", "payment")[0].text).toMatch(/Per week/);
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

  test("Smart Leasing's documentation fee opens its separate terms page", () => {
    on("lease", { ...quoteDraft(), provider: "smartleasing" });
    const pointer = openPicture("docFee");
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/smartleasing/terms-example.webp");
  });

  test("SG Fleet's payment trap uses an amber box and a scrollable full-page toggle", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    const pointer = openPicture("payment");
    expect(pointer.querySelector(".gd-pointer--trap")).toBeTruthy();
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
    fireEvent.click(screen.getByRole("button", { name: "Switch to full page view" }));
    const frame = pointer.querySelector<HTMLElement>(".gd-template__fullpage")!;
    expect(frame).toBeTruthy();
    expect(pointer.querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/sgfleet/redacted-quote.webp");
    Object.defineProperty(frame, "clientHeight", { value: 400 });
    const page = frame.querySelector("img")!;
    page.getBoundingClientRect = () => ({ width: 700, height: 1516, x: 0, y: 0, top: 0, left: 0, right: 700, bottom: 1516, toJSON: () => ({}) });
    fireEvent.load(page);
    expect(frame.scrollTop).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Switch to crop view" }));
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
    on("lease", { ...quoteDraft(), provider: "maxxia" });
    fireEvent.focus(document.querySelector('[data-field="residual"] input')!);
    expect(document.querySelector(".gd-provider-side > img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/maxxia/field-residual.webp");
    expect(screen.getByText("Typical quote")).toBeTruthy();
  });

  test("locate, trap and missing pointers have distinct kinds", () => {
    expect(pointersFor("sgfleet", "payment")[0].kind).toBe("trap");
    expect(pointersFor("sgfleet", "driveaway")[0].kind).toBe("locate");
    expect(pointersFor("paywise", "defer")[0].kind).toBe("missing");
    expect(markerFor("sgfleet", "payment")?.y).toBeGreaterThan(0);
  });

  test("every main provider pointer stays brief and avoids sample-focused jargon", () => {
    const fields: GuideField[] = ["baseValue", "driveaway", "term", "defer", "docFee", "residual", "payment", "luxAdj", "running", "insurance", "fees", "rate"];
    const problems = PROVIDERS.flatMap(({ id }) => fields.flatMap((field) => pointersFor(id, field)
      .filter(({ text }) => text.length > 140 || /sample|example|VSSS|marked \d|available pages|capitalised|\bITC\b/i.test(text))
      .map(({ text }) => `${id}/${field}: ${text}`)));
    expect(problems).toEqual([]);
  });

  test("Oly's residual and Alliance's entry fee use their own marked pages", () => {
    on("lease", { ...quoteDraft(), provider: "oly" });
    expect(openPicture("residual").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/oly/residual-example.webp");
    cleanup();
    window.localStorage.clear();
    on("lease", { ...quoteDraft(), provider: "alliance" });
    expect(openPicture("docFee").querySelector(".gd-template__body img")?.getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-fees.webp");
  });

  test("every field example image exists on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const [id, field] of [["oly", "residual"], ["alliance", "docFee"]] as const) {
      const e = exampleFor(id, field)!;
      expect(fs.existsSync(path.join(__dirname, "../../docs", e.image))).toBe(true);
      expect(imageSizeFor(e.image)).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
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
    expect(imageSizeFor(exampleFor("oly", "residual")!.image)).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
  });

  test("fields missing from a provider's example get a short what-to-do line, without a picture", () => {
    expect(pointersFor("paywise", "defer")[0]).toMatchObject({ notShown: true });
    expect(pointersFor("paywise", "defer")[0].text).toMatch(/Can’t find months deferred on your Paywise quote/);
    expect(pointersFor("fleetpartners", "baseValue")[0].text).toMatch(/Total column of “Vehicle”/);
    // a field the example does show keeps its own pointer
    expect(pointersFor("sgfleet", "defer")[0].notShown).toBeUndefined();
    on("lease", { ...quoteDraft(), provider: "remserv" });
    const line = screen.getByText(/Can’t find a documentation or establishment fee on your RemServ quote/);
    expect(line.closest(".gd-pointer")!.querySelector("button")).toBeNull();
  });

  test("every crop listed exists on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fields = ["baseValue", "driveaway", "term", "defer", "docFee", "residual", "payment", "luxAdj", "running", "insurance", "fees"] as const;
    for (const p of PROVIDERS) {
      for (const f of fields) {
        const src = cropFor(p.id, f);
        if (src) expect(fs.existsSync(path.join(__dirname, "../../docs", src))).toBe(true);
      }
    }
  });

  test("every guide, image path and article link resolves from the shared manifest", async () => {
    const manifest = (await import("../../docs/assets/images/quote-guide/manifest.json")).default;
    const fields: GuideField[] = ["baseValue", "driveaway", "term", "defer", "docFee", "residual", "payment", "luxAdj", "running", "insurance", "fees", "rate"];
    const index = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/provider-quote-guides.md"), "utf8");
    expect(index).toContain("## Most common");
    expect(index).toContain("## All providers");
    const common = index.split("## Most common\n")[1]?.split("## All providers")[0] ?? "";
    expect([...common.matchAll(/how-to-read-(\w+)-quote/g)].map((match) => match[1]))
      .toEqual(["smartleasing", "sgfleet", "maxxia", "paywise", "smartsalary"]);
    const docsRoot = resolve(__dirname, "../../docs");
    for (const key of Object.keys(manifest.images)) {
      expect(existsSync(resolve(docsRoot, "assets/images/quote-guide", key)), key).toBe(true);
    }
    for (const { id } of PROVIDERS) {
      if (id === "other") continue;
      const guide = guideFor(id);
      expect(guide, id).not.toBeNull();
      expect(guide!.seen, id).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      const article = resolve(__dirname, `../../new-site/src/content/docs/start-here/how-to-read-${id}-quote.md`);
      expect(existsSync(article), article).toBe(true);
      expect(readFileSync(article, "utf8"), article).toContain(`latest layout reviewed ${seenLabel(guide!.seen)}`);
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
    expect(article).toContain("**Financier's Establishment Fee** and **1st year Comprehensive Insurance**");
    expect(article).not.toContain("Add the two and enter the total");
  });

  test("Oly's article keeps the financed insurance in Guided's separate question", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-oly-quote.md"), "utf8");
    expect(article).toContain(pointersFor("oly", "docFee")[0].text);
    expect(article).toContain("Financier's Establishment fee and First year Comprehensive Insurance");
    expect(article).not.toContain("Documentation fee: add the two and enter the total");
  });

  test("MillarX payment rows do not assume one GST basis", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-millarx-quote.md"), "utf8");
    expect(article).toContain(pointersFor("millarx", "payment")[0].text);
    expect(article).toContain("Check the payment's GST heading and footnotes");
    expect(article).not.toMatch(/per (month|fortnight), ex GST/);
  });

  test("Easi's per-pay row follows the Guided warning and keeps the deduction caveat", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-easi-quote.md"), "utf8");
    expect(article).toContain(pointersFor("easi", "payment")[0].text);
    expect(article).toContain(pointersFor("easi", "driveaway")[0].text);
    expect(article).toContain("Confirm how many deductions Easi will actually make");
    expect(article).not.toContain("Finance payment, *Per fortnight*, excluding GST");
  });

  test("Remunerator's article uses its yearly payment and deferral pointers", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-remunerator-quote.md"), "utf8");
    for (const field of ["driveaway", "defer", "payment"] as const)
      expect(article).toContain(pointersFor("remunerator", field)[0].text);
    expect(article).toContain("Lease Payment (excl GST), under Annual Car Expenses");
  });

  test("Driva's article names the GST-reduced price trap and the quote's actual review month", () => {
    const article = readFileSync(resolve(__dirname, "../../new-site/src/content/docs/start-here/how-to-read-driva-quote.md"), "utf8");
    for (const field of ["driveaway", "residual", "payment"] as const)
      expect(article).toContain(pointersFor("driva", field)[0].text);
    expect(article).toContain("reviewed in August 2026");
    expect(article).not.toContain("reviewed in November 2026");
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
    expect(article).toContain("reviewed in October 2026");
    expect(article).not.toContain("reviewed in November 2026");
  });

  test("no provider offers a lease-term picture", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const p of PROVIDERS) expect(cropFor(p.id, "term")).toBeNull();
    const dir = path.join(__dirname, "../../docs/assets/images/quote-guide");
    const left = fs.readdirSync(dir).filter((id) => fs.existsSync(path.join(dir, id, "field-term.webp")));
    expect(left).toEqual([]);
  });

  test("no pointers without a named provider", () => {
    on("lease", quoteDraft());
    expect(screen.queryByText(/As seen on/)).toBeNull();
    expect(pointersFor("other", "payment")).toEqual([]);
    expect(pointersFor(null, "payment")).toEqual([]);
  });
});
