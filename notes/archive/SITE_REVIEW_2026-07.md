# Site review & improvement plan — July 2026

Full review of novatedlease.guide (articles + calculator), conducted 2026-07-15.
Method: read all 47 content files, the Astro layouts/styles, and the calculator v2
source; captured live screenshots of the homepage, articles, and calculator at
desktop (1440px) and mobile (390px) widths.

Work through the checkboxes at your own pace — they are ordered by impact.

---

## Overall verdict

The site is in much better shape than "needs an overhaul." The Astro rebuild and
the calculator v2 cut-over (live — `/calculator/` now serves the redesigned app)
have already done the heavy lifting: the homepage with the example-result panel is
genuinely strong, the dark nav + white content design is clean, the calculator's
Simple/Advanced split is best-in-class for this niche, and the SEO plumbing
(per-article OG images, JSON-LD Person/Article/Breadcrumb schemas, pagefind search,
sitemap) is more sophisticated than most commercial competitors. What remains is a
layer of **trust-signal polish, article-page ergonomics, and content-architecture
consistency** — not a redesign.

### What's working well

- **Positioning is crystal clear.** "Independent, models true net cost, not 'tax
  saved'" is stated on the homepage, calculator page, and footer. The ABC News /
  Passive Investing Australia strip and sourced testimonials are excellent social
  proof.
- **The calculator** is the strongest asset: Simple mode's 7-question flow with an
  honest "Assumptions we made for you" panel, the quick tour, share links, saved
  quotes, and the caveat warnings under the headline figure are all things
  providers' calculators deliberately avoid.
- **Content depth and voice.** The articles are rigorous, worked-example-driven,
  and honest about uncertainty. The risks section ("Think like a gambler") is
  unique content nobody else has.

---

## Priority 1 — trust signals on article pages
*(biggest professionalism gain for least effort)*

- [x] **1. "Last updated" dates + author byline on every article.**
  The single biggest gap for a tax/policy site where currency is everything.
  Manual "Updated" badges exist on the homepage, but articles themselves show no
  date and no visible author — readers landing from Google can't tell if an
  article predates the May 2026 Budget.
  - Add `datePublished` / `lastUpdated` to the frontmatter schema in
    `new-site/src/content/config.ts`
  - Render a byline strip under the H1 in `Article.astro`
    ("By Chang Yang · Updated 14 May 2026")
  - Feed `dateModified` into the Article JSON-LD in `Base.astro` (~line 98)
  - Git history can seed the initial dates

- [ ] **2. Related articles / next-steps footer on every article.** (Tried: auto-suggesting
  next 3 nav-order siblings per section wasn't accurate enough as "related" — reverted.
  Would need real per-article curation or topical tagging to be worth doing.)
  Articles currently end at the support box with no onward path (no next/prev, no
  "related"). A small "Keep reading" block of 3 links — even hand-curated per
  section — improves both engagement and the professional feel. The Article layout
  already knows the section, so it can auto-suggest siblings.

- [x] **3. Componentise the support box.**
  It's pasted verbatim as markdown in 41 files; any wording change means 41 edits.
  Turn it into a remark directive or an Astro component injected by the layout,
  with a frontmatter opt-out.

- [ ] **4. Add a "Methodology & update policy" page.**
  How the calculator figures are derived, what sources are used (ATO rulings, DSS
  guides — already cited internally), and how quickly the site reflects policy
  changes. Converts existing rigour (MATHS_AUDIT, parity sweeps) into a visible
  trust signal, and gives journalists something to link.

## Priority 2 — calculator UX

- [ ] **5. Sticky results panel in Advanced mode.**
  Confirmed via screenshots: once you scroll into Financials / Lease details, the
  entire right column is blank white — the result you're tweaking is off-screen.
  Either `position: sticky` the summary card, or float a slim mini-result bar
  ("Total saving: $28,477 ▲") that stays visible while editing. On mobile (result
  sits below all inputs): a floating "See result" chip.

- [ ] **6. Sign off the two open Simple-mode assumptions.**
  The drive-away ÷ 1.08 base-value heuristic and the assumed 9.5% effective
  interest rate (both flagged as pending owner review in `CALCULATOR2_NOTES.md`).
  These directly drive the headline number first-time users see.

- [ ] **7. Post-cut-over cleanup.** (Skipped for now — `/calculator2/` was
  never shared externally so no redirect needed; `/calculator-old/` retirement
  and engine housekeeping deferred to a later time.)

- [ ] **8. Printable / PDF "report" view.**
  People take these numbers to spouses and accountants. Even a print stylesheet on
  the Details tab would go a long way; a distinctive feature no provider offers.

## Priority 3 — content architecture & consistency

- [ ] **9. Unify section naming.**
  Nav says *Fundamentals / Mechanisms / Special Cases*; URLs say `start-here` /
  `costs-and-savings` / `special-and-policy`; breadcrumbs mix them. Pick one
  vocabulary (the nav labels are better) and use it consistently in breadcrumbs,
  section index H1s, and homepage cards. Also: Fundamentals has no index page
  (`/start-here/` doesn't resolve) while every other section has one — add it, and
  make the breadcrumb section label a link.

- [x] **10. Delete dead legacy.**
  - `new-site/src/content/docs/index.md` — stale MkDocs-era homepage (says "34
    articles", inline styles), skipped by routing
  - `new-site/src/components/SideNav.astro` — imported nowhere
  - `costs-and-savings/use-nl-spreadsheet.md` — a meta-refresh redirect stub inside
    the content collection; replace with a real redirect (`redirects` config in
    `astro.config.mjs`)

- [x] **11. Auto-derive article counts.** (Owner chose to remove the count
  mention entirely instead of auto-deriving it.)

- [ ] **12. Expand FAQ blocks + FAQPage schema.**
  Only `is-it-worth-it.md` has an FAQ section, and only the calculator page emits
  FAQPage JSON-LD. Top organic landers (is-it-worth-it, what-is, EV FBT wind-back)
  should each get a 4–6 question FAQ with schema — these still win SERP real
  estate for question-style queries.

- [x] **13. Fix the site-wide horizontal overflow.**
  1343px scrollWidth at 1280 viewport, caused by the nav dropdown (noted in
  working notes as "don't chase for calculator2" — but it's a real site-wide
  defect worth one targeted fix).

## Priority 4 — visual polish (nice-to-have)

- [ ] **14. Replace the AI-generated hero illustrations.**
  The balance-scale clipart on "Is it worth it" reads as generic AI art on an
  otherwise evidence-driven site. Either replace with simple, consistent diagrams
  in the site palette (money-flow diagrams would genuinely aid comprehension —
  e.g. the PAYG vs NL flow in `what-is-novated-lease.md` is begging to be a
  diagram), or drop hero images entirely.

- [ ] **15. Consistent iconography.**
  Emoji section markers (🎓🔍📖☕) are charming but a single-style icon set
  (Lucide/Heroicons — already implicit in the calculator's design) would read more
  professional. Keep the personality in the prose.

- [ ] **16. Featured-in strip uniformity.**
  Lease of Mind and CCS Checker render as small favicon-ish logos with text labels
  while others are proper logos — a uniform grayscale treatment would tidy it.

- [ ] **17. Self-host Google Fonts** (Inter, JetBrains Mono).
  Removes a render-blocking third-party request; trivial with fontsource packages
  or Astro's font handling.

- [ ] **18. Dark mode** — genuinely optional, but the token structure in
  `global.css` makes it cheap if ever wanted.

## Priority 5 — distribution

- [ ] **19. RSS feed + "What changed" page.**
  The audience tracks policy (EV FBT wind-back, payday super, ATO rates). A
  changelog-style page with an RSS feed (`@astrojs/rss` is a 30-minute add) turns
  one-time visitors into returners, and gives Reddit/OzBargain threads something
  to cite.

- [ ] **20. `llms.txt`** — cheap, and this site is exactly the kind of resource AI
  assistants get asked about ("is a novated lease worth it").

---

## Suggested new articles

Ranked by (search demand × fit with existing coverage). Biggest theme: the site
covers *deciding* and *risks* superbly, but the **lifecycle after signing** (end
of lease, job change, tax time) is thin.

### High priority — clear gaps with strong search intent

- [ ] **1. "Novated leases and HECS/HELP debt"**
  RFBA raises HECS repayment income; a lease can trigger compulsory repayments
  people didn't budget for. Mentioned in passing in the quote-reading article; it
  deserves the full treatment with worked examples per income band. Probably the
  most-asked question without a page.

- [ ] **2. "End of lease: your five options"**
  Pay out the residual, refinance it, sell, trade in, or re-lease. *Early*
  termination is covered thoroughly but not the normal endgame decision, which
  every lessee eventually googles.

- [ ] **3. "Changing jobs with a novated lease"**
  The transfer-to-new-employer path step by step: what if the new employer
  refuses, the gap period where you pay obligations personally, negotiating NL
  support in a job offer. Complements the early-termination pieces.

- [ ] **4. "What is a BYO / self-managed novated lease?"**
  The Employer BYO Checker tool exists but no article explains the concept, the
  savings magnitude, and how to pitch it to payroll. Would also funnel into the
  tool.

- [ ] **5. "PHEVs and the FBT exemption after April 2025"**
  Transitional rules; what breaks a pre-existing commitment (re-financing,
  changing employers). Currently only "previously PHEVs" in passing — a dedicated
  page captures a confused, motivated audience.

- [ ] **6. "Medicare Levy Surcharge, Div 293 and child support: the other RFBA
  effects"**
  The ATI article covers mechanics; this covers the threshold cliff effects with
  concrete trigger incomes (one article, or folded into an expanded ATI cluster).

### Medium priority

- [ ] **7. "How to actually get a good deal: negotiating quotes and choosing a
  provider"** — get multiple quotes, which numbers are negotiable (effective rate,
  fees, insurances), questions to ask, red flags. The procurement playbook that
  ties the analysis tools together.

- [ ] **8. "Can you include a home charger in your novated lease?"**
  Chargers aren't covered by the car FBT exemption (separate benefit); a known
  trap for EV lessees and a nice narrow SEO target.

- [ ] **9. "Novated lease at tax time: what RFBA on your income statement means"**
  A practical July walkthrough (where it appears, what to do in myTax, why
  'grossed-up' looks scary). Seasonal traffic every year.

- [ ] **10. "Novated leases and your borrowing capacity"**
  How lenders treat NL deductions when assessing a mortgage; mentioned in the FAQ
  but a dedicated page would rank.

- [ ] **11. "Associate leases: packaging your spouse's or an older car"**
  Adjacent product people constantly conflate with NLs; even a "here's why I don't
  cover this in depth" explainer captures the query.

- [ ] **12. "Novating a used car: rules, residuals and pitfalls"**
  Broader companion to the Division 66 GST piece (minimum residuals on older cars,
  financier age limits, sale-and-leaseback of your current car).

### Lower priority / structural content

- [ ] **13. Case-study library**
  Two killer worked examples exist ($21,320 → net loss; Tesla vs Mazda). A series
  at $60k / $90k / $150k / $220k incomes, EV vs ICE, would be highly shareable and
  feed the calculator.

- [ ] **14. "Novated lease myths, corrected"**
  A roundup linking into existing articles; cheap to write, good link magnet.

- [ ] **15. "FBT year timing: does it matter when your lease starts?"**
  31 March / 1 April boundary effects — now more interesting with the 2027/2029
  tier dates.

---

## Suggested starting point

For maximum visible lift in one weekend: items **1–3** (dates/byline,
related-articles footer, support-box componentisation) plus **5** (sticky
calculator results panel) — those four change how professional the site *feels*
on every single page.
