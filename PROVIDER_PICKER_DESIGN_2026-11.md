# Provider picker and "where to find it" pictures: design (2026-11-12)

> **Status (2026-11-12):** the review branch has an optional picker and dated text pointers for
> every named provider in its list. All 27 named providers now have numbered, redacted quote-page
> examples and quote-reading articles. Each example is available as a raster preview, a focused
> crop for marked fields, and an image-based PDF. The earlier generated schematics were
> replaced after owner feedback.
> Covers issues 16–19 in `QUOTE_FORMAT_ISSUES_2026-11.md`.
> Most layouts were reviewed in August–November 2026; the LeasePlan example is from August 2025.

Goal: a reader who tells us their provider gets a short, dated pointer, and later a picture crop,
at each Guided field where the general wording isn't enough. A reader who doesn't, or whose
provider we haven't covered, gets exactly today's experience plus the improved general hints.

## Implementation decisions after the original proposal

- The picker moved to the **Price** step, before the first quote figures. This lets drive-away and
  FBT pointers appear on the reader's first pass. The original proposal below placed it on Lease.
- The owner clarified that each template should preserve the reviewed quote's actual page layout,
  with customer values and identifying details removed and the Guided fields numbered. All 27
  reviewed redacted examples in the private quote-review folder were used; the unfinished
  FleetPartners example needed an extra vehicle-detail redaction and numbered markers.
- Guided reveals a focused crop beside matching fields. Each provider article shows the full
  page, a numbered key and a PDF link. These PDFs are image-based exports of the redacted page,
  since the review material is screenshots, not original editable PDF files.
- A provider layout more than six months old gets a caution in Guided. The original proposal below
  remains as historical design context; this implementation decision supersedes it.

---

## (a) The provider dropdown (issue 16)

### Where it sits

On the **Lease** step (`LeaseStep`), as the first question, above "Lease term". This is the first
screen where the reader is reading their quote line by line, and the deferral hint (issue 7) and
doc-fee hint (issue 8) on the same screen already benefit from knowing the provider. The
**Price** step comes earlier, but the Flare and Oly drive-away pointers (issue 4) are the only
ones there. Those can be shown on the Price step after the reader goes back, or simply as general
wording. Putting the picker any earlier, on "Do you have a quote?", would add a question before
the reader has opened their quote.

The existing "Is your lease with Smart Leasing or MillarX?" question on the Payment step is
**removed**. The correction callout appears on the Payment step whenever `provider` is
`smartleasing` or `millarx`.

### The control

A native `<select>` (accessible, works on phones, no new component), labelled
"Who is your quote from? (optional)", with a hint "Helps us point to the right lines. Your quote
stays on your device." Default: "Choose, or skip". Sorted alphabetically, with "Other / not
listed" last, and the five highest-volume providers repeated in an optgroup at the top:

| id | Label shown | Notes |
|---|---|---|
| `smartleasing` | Smart Leasing | correction tool (2 months) |
| `sgfleet` | SG Fleet | pointers: payment, deferral, base value, weekly |
| `maxxia` | Maxxia | pointers: payment, insurance financed |
| `paywise` | Paywise | |
| `smartsalary` | Smartsalary (Smart Drive) | |
| `alliance` | Alliance Leasing | QLD Gov template |
| `autopia` | Autopia | |
| `customfleet` | Custom Fleet | luxury adjustment alias |
| `driva` | Driva | |
| `easi` | Easi (EasiFleet) | |
| `fingo` | Fingo (Automotive Lease Packaging) | |
| `flare` | Flare | drive-away pointer |
| `fleetpartners` | FleetPartners | doc-fee pointer |
| `leaseexpress` | LeaseExpress | |
| `leaselab` | LeaseLab | weekly |
| `leaseplan` | LeasePlan / Ayvens | doc-fee pointer |
| `lendly` | Lendly | |
| `millarx` | MillarX | correction tool (deferral months) |
| `nla` | Novated Lease Australia (NLA) | |
| `oly` | Oly | drive-away pointer |
| `orix` | ORIX | fee footnote, luxury adjustment alias |
| `remserv` | RemServ | |
| `remunerator` | Remunerator | yearly payment |
| `simplygreen` | Simplygreen | |
| `spa` | Salary Packaging Australia (S.P.A.) | |
| `toyotafleet` | Toyota Fleet Management | |
| `vehiclesolutions` | Vehicle Solutions | |
| `other` | Other / not listed | |

Providers with no pointers yet are still listed: picking one costs the reader nothing, and the
analytics tell us which ones to cover next.

### Draft field and migration

`draft.ts`:

```ts
export type ProviderId = "smartleasing" | "sgfleet" | /* … */ | "other";
// GuidedDraft
provider: ProviderId | null;   // null = not answered (it's optional, so never "missing")
smartMillarx: boolean | null;  // kept, now derived; see below
```

- **`smartMillarx` stays** as a derived field so `checks.ts` (`checkPaymentCorrected`), the
  callout and existing tests keep working: `smartMillarx = provider === "smartleasing" ||
  provider === "millarx"`, set whenever `provider` changes.
- **Saved drafts** (`nlc2-guided-draft-v3`, loaded through `{ ...emptyDraft(), ...parsed.draft }`):
  no key bump needed. In `loadStored`, after the merge:
  - `smartMillarx === true && provider == null` → `provider` stays `null`, and the Payment step
    shows a one-off "Smart Leasing or MillarX?" pair of buttons (the old question, shown only to
    these migrated readers), so we don't guess which of the two it was;
  - `smartMillarx === false && provider == null` → leave `provider` null. They told us "neither",
    which matches skipping the dropdown.
- `missing.ts` / the review checklist: `provider` is never required. The old
  `ask("smartMillarx", …)` line is removed.
- **Advanced mode** is unchanged: it keeps the "Smart Leasing / MillarX customer?" link.
  `buildInputs` doesn't need the provider.

### Analytics

One event on change, none on load: `trackEvent("guided_provider", { provider: id })`, where
`id` is the closed-list id above, never free text. Optional later:
`guided_pointer_open { provider, field }` when a reader expands a picture. Both go through the
existing `utils/analytics.ts`, so they respect the same consent and opt-out as other events.

---

## (b) Pointer data: dated, per provider, per field

### Types

```ts
// calculator2/src/guided/providerGuide.ts
import type { QuoteKey } from "./QuoteDiagram"; // baseValue | driveaway | term | defer | docFee | residual | payment | luxAdj | running

export type GuideField = QuoteKey | "insurance" | "fees";

export type Crop = {
  /** Under docs/assets/images/quote-guide/<provider>/, e.g. "sgfleet/2026-11-payment.webp". */
  src: string;
  width: number;          // intrinsic, so the box is reserved before it loads
  height: number;
  alt: string;            // describes what is boxed, not the reader's numbers
  /** Highlight rectangles in the crop's own pixels, drawn as an overlay (not baked in). */
  boxes?: { x: number; y: number; w: number; h: number }[];
};

export type Pointer = {
  field: GuideField;
  /** One or two short sentences, worded "If you see X, …". Plain text, no HTML. */
  text: string;
  /** Optional nuance for a tooltip (house style: short main text, nuance in tooltips). */
  more?: string;
  /** Picture added under issue 18. Text-only pointers simply omit it. */
  crop?: Crop;
  /** Can change the reader's answer, e.g. preselect a period. Kept explicit and rare. */
  suggests?: Partial<{ paymentPeriod: "perWeek" | "perFn" | "perMonth" | "perYear"; monthsDeferred: 0 | 1 | 2 }>;
};

export type ProviderGuide = {
  id: ProviderId;
  label: string;
  /** Month of the newest quote layout these pointers were checked against, "YYYY-MM". */
  seen: string;
  /** Reddit post ids or submission ids the pointers were checked against. Kept out of the UI. */
  sources: string[];
  pointers: Pointer[];
};
```

Rendering: one small `ProviderPointer` component, placed under the matching field (the same
slot the `findings` already use). It shows the text, "As seen on {label} quotes, {Mon YYYY}"
in muted type, and the crop if there is one. A pointer older than the staleness limit (see (c))
gets "may have changed". `suggests` never applies silently: it shows a button ("Use per week")
the reader can tap.

### Worked examples (findings as of Nov 2026)

```ts
export const SGFLEET: ProviderGuide = {
  id: "sgfleet",
  label: "SG Fleet",
  seen: "2026-11",
  sources: ["1xrc93u", "1xp7rio", "1xoemj6"],
  pointers: [
    {
      field: "payment",
      text: "If you see both “Lease rental” (per pay) and “Monthly lease rental”, enter the per-pay “Lease rental”. It's ex GST.",
      more: "“Monthly lease rental (payable as 34 payments)” is the financier's payment. The per-pay figure spreads the same total over the whole term, which is how this calculator reads a payment.",
    },
    {
      field: "defer",
      text: "If you see “payable as 34 payments” on a 36-month lease, that's a 2-month deferral (36 − 34).",
    },
    {
      field: "baseValue",
      text: "If it isn't on the first pages, look for “FBT Base Value” near the end of the quote.",
    },
    {
      field: "luxAdj",
      text: "If you see “Luxury levy” or “Luxury vehicle adjustment”, that's this line.",
    },
    {
      field: "running",
      text: "If your pay is weekly, the package lines are per week. Choose “Per week”.",
      suggests: { paymentPeriod: "perWeek" },
    },
  ],
};

export const MILLARX: ProviderGuide = {
  id: "millarx",
  label: "MillarX",
  seen: "2026-10",
  sources: ["1xcd4xa", "1xj7w9y", "1x6ikxh"],
  pointers: [
    {
      field: "defer",
      text: "If you see “$X/mth × 58” on a 60-month lease, that's a 2-month deferral (60 − 58). “× 59” means 1.",
    },
    {
      field: "payment",
      text: "If you see “Finance + fee”, take the management fee out first (monthly fee × 12 ÷ 26 per fortnight), then use the correction tool.",
      more: "MillarX collects the fortnightly figure for the whole term while the financier is paid term − deferral times; the tool takes the extra out.",
    },
    {
      field: "docFee",
      text: "If you see “Setup fee” under “What you're financing”, that's the documentation fee.",
    },
    {
      field: "residual",
      text: "If you see “Balloon (ex GST)”, choose Excluding GST.",
    },
  ],
};

export const FLARE: ProviderGuide = {
  id: "flare",
  label: "Flare",
  seen: "2026-11",
  sources: ["1xrpgvb", "1xptqzg"],
  pointers: [
    {
      field: "driveaway",
      text: "If you see “Vehicle cost — Flare Cars driveaway cost”, don't use it: it has the GST saving taken off. Use “Total on-road price”.",
    },
    {
      field: "baseValue",
      text: "If you see “FBT base value” in “Calculating your quote”, use it as printed.",
    },
    {
      field: "payment",
      text: "If you see “Finance” under “Budgeted running costs”, that's the fortnightly payment, ex GST.",
    },
  ],
};
```

All pointer text above is generic (labels only); no figures from anyone's quote.

---

## (c) Annotated crops (issue 18)

### Storage and naming

- Path: `docs/assets/images/quote-guide/<provider>/<YYYY-MM>-<field>.webp`, e.g.
  `docs/assets/images/quote-guide/sgfleet/2026-11-payment.webp`. (`new-site/public/assets` is a
  symlink to `docs/assets`, so these are committed under `docs/`.)
- One crop per field per layout. When a layout changes, add a new dated file and point the guide
  at it. Old files stay until nothing references them.
- Format: WebP, about 900 px wide at 2× for a ~450 px display, under 60 KB each. Keep the
  redacted source PNG in `private/quote-guide-sources/<provider>/`, never in the repo.
- Highlight boxes are drawn by CSS from `Crop.boxes`, not baked into the image, so one crop can
  serve two fields and the colour follows the theme.

### Redaction rules (before anything is committed)

1. **Solid boxes, never blur**, over: names, employer, email, phone, address, consultant details,
   customer, quote and reference numbers, dates, barcodes and QR codes.
2. **Replace the dollar figures** with round example numbers, consistent with each other (e.g.
   drive-away $60,000, monthly $1,000, fortnightly $461.54). Use the same font where possible.
   Otherwise box the figure and overlay the example number.
3. Strip EXIF and metadata. Re-encode from a screenshot of the redacted file, not the original.
4. A second check by someone other than the redactor before commit (the owner, or a fork asked
   only to look for personal data).

### Display

- Inside Guided: under the matching field, collapsed behind "Show me on a {label} quote".
  Loaded with `loading="lazy"` and `decoding="async"`, and the `<img>` is only created when expanded,
  so the bundle and first load are unchanged.
- Reserve the space with the intrinsic width and height (no layout shift).
- **Dark theme:** quotes are white documents. Put the crop on a `--nlc-surface` card with a 1 px
  `--nlc-border` frame and 8 px padding, at `opacity: 0.92` in dark theme so it doesn't glare.
  The highlight box uses `--nlc-blue` with a 2 px outline plus a translucent fill.
- **Mobile:** crops are per field, not per page, so text stays readable at 343 px wide. Max
  display width 100% of the card. Tap opens the full crop at native size in a simple overlay.
- Under each picture: "As seen on {label} quotes, {Mon YYYY}. Mine looks different? Send it to us."
  The link goes to the submission route in issue 19.
- **Staleness:** if `seen` is more than 6 months before today, show "may have changed" next to
  the date and keep showing it. Hide the crop (keep the text) after 12 months.

### Consent and sources (issue 19)

- **Publish only consented submissions.** The Reddit screenshots in `private/quote-review-2026-11/`
  are for learning layouts and spotting changes, and as a guide when redrawing. They are never
  committed or shown.
- Submission route (owner's choice; see decisions): an email address or a short form. Consent
  line shown before sending:
  "You agree we may show parts of this quote on novatedlease.guide to help others read theirs.
  We cover all personal details and change the dollar figures before publishing. Ask us any time
  to take it down."
- Keep each consent with its source file in `private/quote-guide-sources/<provider>/consent.md`
  (who, date, how given). The repo only ever holds the redacted crop.
- No provider endorsement or criticism in captions: factual labels only.

---

## (d) Monthly freshness check (issue 20)

### What it runs

The scripts already in `private/quote-review-2026-11/scripts/`:

1. `pull.py`: page the Arctic Shift API for new r/NovatedLeasingAU posts since the last run
   (store the last `created_utc` in `private/quote-review-2026-11/data/last_run.json`). It must
   shell out to `curl` (Python's urllib fails SSL here) and back off on "Timeout. Maybe slow down".
2. Download new post images (i.redd.it urls and gallery `media_metadata[*].s.u`), skipping 404s.
3. `tesseract` each new image.
4. `classify.py`: match provider names in OCR text plus title/body.
5. **New step, layout fingerprint:** for each provider, extract the set of label strings that
   appear in that provider's pointers (e.g. "payable as", "Monthly lease rental", "Lease rental")
   and record which are present on the newest quote. A label that disappears, or a known provider
   whose quote contains none of its expected labels, is a likely layout change.

### Where it runs

Locally on the owner's Mac (Arctic Shift, tesseract and the iCloud `private/` folder are all
there), as a monthly scheduled Claude Code job or a plain `launchd` entry. A cloud job would need
the private folder and tesseract, so local is simpler.

### What it reports

A short Markdown note written to `private/quote-review-2026-11/freshness/<YYYY-MM>.md`, and a
summary in the session:

- per provider: newest quote date and post id, number of new quotes, and **changed?**
  (expected labels missing, or new labels such as "inc GST" next to a payment);
- providers seen for the first time (no guide entry yet);
- guide entries whose `seen` date is now over 6 months old;
- links to the new posts to check by hand.

It never edits the guide data or images. A human checks the flagged quote and updates `seen`,
pointer text or crops.

---

## Suggested build order

1. Provider dropdown + `provider` field + migration + analytics (no pointers yet). Ship, and
   watch two weeks of `guided_provider` data.
2. `providerGuide.ts` with text pointers for SG Fleet, MillarX, Flare, Smart Leasing, Maxxia.
3. Freshness check script (needs nothing from steps 1–2).
4. Crops for the pilot providers once consented quotes arrive.
5. Per-provider articles (issue 17) built from the same guide data and crops.

## Owner decisions needed

1. **Placement:** first question on the Lease step (recommended), or on the Price step?
2. **Migration:** for saved drafts that answered "Yes, Smart Leasing or MillarX", show the old
   two-button question once (recommended), or ask them to pick from the dropdown?
3. **Provider list:** keep all ~27 (recommended, for analytics), or only those with pointers
   plus "Other"?
4. **Pointer wording:** happy with the "If you see X, …" style, with nuance in a tooltip?
5. **`suggests`:** allow pointers to offer a one-tap answer (e.g. "Use per week"), or text only?
6. **Pilot crops:** SG Fleet and Smart Leasing first? Who supplies consented quotes?
7. **Example numbers in crops:** replace real figures with round examples (recommended), or box
   them out entirely?
8. **Submission route:** a dedicated email address, a form, or the contact page?
9. **Consent wording** as drafted above, or changes?
10. **Staleness:** "may have changed" after 6 months and hide crops after 12 (recommended), or
    different limits?
11. **Freshness check:** monthly local job (recommended), and should it run as a scheduled Claude
    Code task or a plain script?
