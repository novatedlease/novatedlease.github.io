# In progress

Every open item on the site and calculator, merged from the old notes files on 2026-11-20.
- Detailed specs live in `notes/`.
- Finished and superseded notes are in `notes/archive/`.
- Private items (anything that names a reader) stay in `private/` and are only pointed to here.

When you finish something, delete its line. When you start something big, give it a spec in `notes/`
and link it from here.

---

## 1. Active now

**Guided mode polish** — spec: `notes/GUIDED_POLISH_PLAN_2026-11.md`.
- A Sonnet agent works one item at a time. It commits only after the owner OKs an item, and never
  pushes.
- **A1 (blank space under the calculator) is implemented but not committed.** It's a 2-line change in
  `new-site/src/pages/calculator/index.astro`. Owner to check, then commit, then start A2.
- Still to do:
  - A2–A8: the step bar ticks incomplete steps; exploring-path rounding; rate shown at two precisions;
    "Your answers" rows; "Compared against"; a repeated subtitle; the luxury-adjustment period order.
  - B1–B3: contrast, underlined links, the `<dl>` markup.
  - C1–C2: thousands separators; a running-costs total.
  - D-2: an interest-rate what-if slider.
  - D-3: print / PDF.
  - D-4: a net-cost bar chart.
- Declined: the take-home check on the results page (owner, 2026-11-20).

## 2. Calculator — open, not started

**From the provider-guide work.** Details and evidence are in
`notes/PROVIDER_GUIDE_HANDOVER_2026-11-15.md` ("Open, not started" and the end of the file).
- Continue the provider walkthrough from the providers not yet marked good.
- Maxxia/Oly: answering No / Not sure to "first-year insurance financed?" on a quote that does finance
  it takes the renewal budget as the full premium. A hint under the insurance box was proposed.
- Survey the extras each provider finances (Lendly tint and dash cam, Maxxia optional insurances).
- Smart Leasing's drive-away pointer ("Can't find a drive-away total?") is softer than the panel's
  "Not shown on the Smart Leasing quotes we've seen". Align them.
- `sources` in `providerGuide.ts` include other brands' quotes from comparison posts. Tidy.
- Kilometres crops: "Whole page" doesn't scroll to the line (no number marker).
- Current-car typical figures have no basis note, unlike the new car's lease-end value.
- Inside Edge's running layout was hand-added to the generated `runningLayout.ts`, and its insurance
  box says "Comp Insurance Provision". Ask before regenerating.
- CarBon "Finance Management Fee" and the Lendly $236.47 residual-base extra and "Licence Fee" are
  unexplained.
- Provider article tables: 27 hand-written tables still duplicate the guide wording, and
  `dateModified` isn't driven by `seen`. See `notes/archive/PROVIDER_GUIDE_HANDOVER.md` (item 15).
- Raise the "Checked against N quotes" counts as new quotes appear.
- Queensland Government "Summary Table" quotes: the supplier margin is unexplained. Parked; 24 quotes
  in `private/qld-summary-table/`.
- Lendly × 11 pointer: only one quote so far. Wait for more evidence.

**From the quote-format review** (`notes/QUOTE_FORMAT_ISSUES_2026-11.md`; its owner-decisions log is
still the reference).
- Issue 14, Maxxia "Financed payments" that include fees: an optional "other amounts financed" box was
  built on a review branch and never merged. Decide whether to keep it.

**Older calculator items** (`CALCULATOR2_NOTES.md` §3, `notes/archive/SITE_REVIEW_2026-07.md`).
- Sign off the exploring-path assumptions: drive-away ÷ 1.08 for the FBT base value, and the 9.5%
  interest rate (`calculator2/src/assumptions.ts`).
- EV FBT $75k transitional cap and the 2027/2029 tier dates: re-check against the bill text now that
  the bill article is live.
- Post-cut-over housekeeping: retire `/calculator-old/`; converge v1 onto `engine/rfba.ts` /
  `engine/fbt.ts`; derive `GST_EXEMPT_CAP` from a `CAR_LIMIT` constant.
- Advanced mode on phones: a floating results bar (the desktop sticky column is done). Re-check phone
  vs desktop completion first.
- Quick tour: the July test checklist was never ticked (`notes/archive/PROMPT_quick_tour.md`).
  Re-test the tour once.

**Parked by the owner** (don't start without asking):
- Smart-branded Smartsalary escape hatch (provider review item 8).
- Early-exit figure on Guided results.
- Comparing two quotes in Guided.
- End-of-lease options (refinancing the residual, selling or trading in the car).
- Part-year terms in Guided.

## 3. Content and SEO

- **Publish the Smart Leasing real example.** Local and uncommitted:
  - `new-site/src/content/docs/costs-and-savings/real-example-smartleasing-21000-cheaper.md`;
  - images in `docs/assets/images/smartleasing-example/`;
  - `.quote-evidence` in `global.css`.

  It needs the reader's answers first:
  - Were the accessories and small-damage cover asked for in quote 1?
  - What made up its $79,267 amount financed?

  It also needs your decisions on:
  - the $612 vs $632 per-fortnight gap;
  - the "Partly" wording on the extras row;
  - the tint price ($840 vs ~$560).
- **Site fact-check (23 Oct): 43 fixes, none applied.** The list is in
  `private/site-factcheck-2026-10.md` (private because it mentions a reader). Start with the high
  priority items, plus the GA4 `?c=` privacy mismatch in `Base.astro`.
- **"What changes on 1 April 2027" page**, when the EV FBT wind-back passes or gets close.
- **Check Search Console results in early December 2026** for the 10 Nov SEO changes. Look at CTR on
  `/start-here/is-it-worth-it/`, and positions for "can you pay out a novated lease early", "how
  much is the residual on a novated lease", "how much can I save with a novated lease" and "can
  employer claim gst on novated lease".
- **Links and mentions:** another guest post or two (FIRE blogs, The Driven, doctors' and nurses'
  publications); ask journalists to name or link the site.
- Optional: retitle "The catch that existed for decades: FBT" to "...FBT on a novated lease" in
  `what-is-novated-lease.md`.
- From the July site review, still open:
  - a "Keep reading" block on articles (auto-suggesting was tried and reverted; it needs curation);
  - a "Methodology & update policy" page (`/about/history/#how-the-maths-is-checked` covers part of
    it);
  - one vocabulary for section names across nav, URLs and breadcrumbs, plus a `/start-here/` index
    page;
  - FAQ blocks with FAQPage schema on the top landing articles;
  - a single icon style instead of emoji on the homepage;
  - a uniform "Featured in" logo strip;
  - self-hosted fonts;
  - RSS plus a "What changed" page;
  - `llms.txt`.
- Article ideas from July not yet written:
  - end of lease: your five options;
  - changing jobs with a novated lease;
  - PHEVs and the FBT exemption;
  - MLS, Div 293 and child support (the other RFBA tests);
  - getting a good deal and negotiating;
  - a home charger in the lease;
  - RFBA at tax time;
  - associate leases;
  - novated lease myths;
  - FBT-year timing;
  - a case-study library.

  HECS, borrowing capacity, used EVs and early termination already have articles.
- Old WIP branches from 7 Aug, each one commit ahead and never merged. Decide: merge, mine or delete.
  - `wip/byo-email-template`: a copy-to-clipboard BYO request email;
  - `wip/early-termination-payout`: present-value payouts;
  - `wip/gst-not-passed-eir`: an article on how GST not being passed on inflates the effective rate;
  - `wip/maths-section`: a "Maths — the derivations" section;
  - `wip/_snapshot-before-split`.
- Leftover `worktree-agent-*` branches from 12 Nov, most likely superseded by later commits on
  `main`. Check, then delete.

## 4. BYO checker and data

Detail: `private/byo-sources.md`, and the Claude memory note "pending follow-ups Oct 2026".
- Add Peninsula Health / Peninsula Care Group as aliases of Bayside Health. Maybe also Royal Hobart
  Hospital / Tasmanian Health Service as aliases of Tasmanian Government (inference only).
- Note that Bayside and Western Health deductions go via Maxxia.
- Bayside "passed / not passed" list: confirm whether it's about GST being passed on before recording
  it.
- The Facebook export only holds your own replies, so a few BYO entries may lack the employer.
- Idea: an anonymised dataset of effective rates (panel vs BYO) as citable evidence.
- A reader case study (rate cut from 19% to ~8%): follow up if they replied to the invitation.

## 5. Ongoing and housekeeping

- **Coffee-nudge A/B test** (social-proof wording) running since 2026-11-10. Check results mid-December.
- **After the provider-guide merge**, look at these in GA4:
  - `next_step_*` events: the checklist card moved to last place;
  - the questions in `notes/archive/PROVIDER_GUIDE_MERGE_CHECKLIST.md`, four weeks after launch.
- Monthly provider-guide freshness check: `notes/PROVIDER_GUIDE_MAINTENANCE.md`.
- **Hosting:** move off public GitHub Pages (Cloudflare Pages from a private repo, or GitHub Pro).
  Not decided.
