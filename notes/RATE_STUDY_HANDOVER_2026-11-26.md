# Handover: "What interest rates are novated leases really charging?" (rate-study article)

Written 2026-11-26 for continuing in Codex. Read this, then `IN_PROGRESS.md` (section 4, "Reddit quote rate study"), then the article.

## 1. Where everything is

| What | Where | In git? |
|---|---|---|
| The article (draft) | `new-site/src/content/docs/costs-and-savings/novated-lease-interest-rates-reddit-quotes.md` | yes (committed, **not pushed**) |
| Article styles (range bars, heat grid, box plot, flow chart, source lists) | `new-site/src/styles/global.css`, search "Rate study" and "sample-selection flow chart" | yes |
| The data pipeline and all readings | `private/quote-review-2026-11/rate-pilot-2026-11-20/full/` | **no**: `private/` is a git-ignored symlink to iCloud |
| Article build tools (one-step rebuild) | `private/.../full/article_tools/` (`rebuild_article.py` is the entry point) | no |
| Review pages for owner checks | `private/quote-review-2026-11/unsalvaged-review/` (`server.py`, serves on port 4344) | no |
| Claude memory | `~/.claude/projects/-Users-changyang1230-novated-lease-guide/memory/project_rate_pilot_nov2026.md` | no |

The dev server for the article is `cd new-site && npx astro dev --port 4322 --host 0.0.0.0`. Draft URL: `http://localhost:4322/costs-and-savings/novated-lease-interest-rates-reddit-quotes/`. Do **not** run two Astro dev servers in the same folder (they corrupt `.astro/data-store.json`).

The article carries a `DRAFT` banner and is linked from no index. **Do not push before reading section 8.**

## 2. The question and the headline (current numbers)

Four questions: (1) what effective interest rate (EIR) do people really pay, (2) how much margin does the lease company make assuming a 7 to 8% base rate, (3) do companies differ, (4) do car price and term matter.

Scope: r/NovatedLeasingAU only (posts and comments), all quote images from 1 Jul 2025 to 24 Nov 2026. Other subreddits were deliberately left out.

Current result: **773 verified quotes, median 9.7%, middle half 8.4 to 11.5%**; typical extra cost $2,727 (vs 8%) to $4,417 (vs 7%); 97% of quotes above 7%, 82% above 8%. Funnel: 1,266 readings, 1,077 provider quotes, 1,044 distinct, 910+ complete, 846 usable, 815 verified, 773 in the tables (the flow chart in the article is generated and reconciles to the pipeline; do not edit its numbers by hand).

## 3. How a number is produced (pipeline)

Run from `private/quote-review-2026-11/rate-pilot-2026-11-20/full/`.

1. **Reading.** Claude Sonnet agents read each quote image (instructions in `INSTRUCTIONS.md`; second independent read uses `INSTRUCTIONS2.md`). Apple Vision OCR (`vision-ocr/`, parsed in `ocr_parsed.json`) is a cross-check. Provider-guide re-reads for ORIX, Driva, Oly, Autopia, Flare, Paywise, Smart Leasing and ten smaller providers are in `guide/*.jsonl`, read "exactly as the provider guide defines the fields" (the guides are `new-site/src/content/docs/start-here/how-to-read-*-quote.md`; the owner wrote them and they are the authority, not general rules).
2. **Inputs** (`sonnet_to_inputs.py`): financed amount, residual, term, deferral, payment, basis. Key rules: default deferral 2 months when a quote states none; Smart Leasing and MillarX payments include a budget reserve so payment x (term-2)/term (`basis=actual`); $550 ex GST documentation fee on every Smart Leasing quote unless the terms page prints another (Smart Leasing terms pages print $605 inc GST on 19 of 21 posts, $275 and $330 on two); financed amount is the printed one if it fits the residual, otherwise residual / ATO % + doc fee; a printed financed amount too small for its residual (residual cannot exceed the ATO % of the financed amount) is rebuilt from the residual (`residual_fix`, mostly SPA).
3. **Engine** (`engine_rates.ts`, run through vite-node from `calculator2/`): the calculator's own maths (monthly rate r/12, payments in advance, residual = ATO % of the financed amount; ATO % are 65.63, 56.25, 46.88, 37.5, 28.13 for 1 to 5 years, always two decimals, never 28.125). Arrears is modelled separately because the calculator has none.
4. **Merge and verification** (`merge.py`). A quote is *verified* when: OCR gave the same figures (`figures_agree`/`ocr_agrees`), or the calculated rate reproduced the printed finance rate (`printed_rate_match`), or a second independent Claude read agreed on term, residual and payment (`second_read_agrees`), or the owner paired the pages by hand (`owner_checked`). Anything else is `sonnet_only` and left out of the tables.
5. **Screens** (`build_tables.py`): drop quotes whose calculated rate differs from their own printed finance rate by more than 2 points (a field was probably misread; label contains "discount" or "comparison" is ignored); drop rates outside 3 to 25%; Maxxia summary cards are shown separately (upper bound).
6. **Salvage** (`salvage.py`): treats a post and the poster's own image comments (same author) as one source, merges partial readings of the same quote when the provider matches, takes a term stated in the post text, and applies the owner's manual pairings from `overrides.json`.
7. **Owner decisions** live in `overrides.json`: `exclude` (3 quotes), `defer`, `fin` (financed amount from a terms page posted as a comment, post `1oqqrbj`), `reviewed` threads, `manual` merged quotes.

Rule from the owner: quotes with a non-whole-year term (13, 21, 30 months) are thrown out automatically.

## 4. Rebuild everything in one step

```
cd private/quote-review-2026-11/rate-pilot-2026-11-20/full
python3 article_tools/rebuild_article.py            # whole chain
python3 article_tools/rebuild_article.py --skip-pipeline   # only regenerate tables, charts and counts
```

It runs `salvage.py` and `run_all.sh` twice (salvage reads `final.json`), `build_tables.py`, then regenerates the provider table, the car value x term grid, the box plot, the Sources list, every count in the prose and the flow chart. It replaces the provider table and heat grid by swapping them for `<<PROV>>`/`<<GRID>>` markers and back, so **do not hand-edit those blocks, the box plot, the flow chart or the Sources section**: they are overwritten. Edits to the surrounding prose are safe. `refresh_article.py` rewrites a few specific sentences by regex (title, "Source", "Verified", "Car value", "Missing fields", "Printed amount financed", Smart Leasing exclusions bullets); if you reword those, change the matching pattern in the script or the next rebuild will not find them (it prints `MISSING <pattern>`).

## 5. What the owner decided (do not relitigate)

- Follow the provider-specific guides for field choices; car value in the tables is the **FBT base value** (printed or derived), no drive-away or financed fallback.
- Smart Leasing: $550 ex GST documentation fee on all quotes. Exclude Smart Leasing quotes whose financed total includes ticked insurance or service add-ons but is not shown, GST-not-passed-on cases, and non-quote calculator screenshots. (Assuming $550 when the true fee is lower overstates financed and understates the rate, so it favours Smart Leasing; the methods note says so.)
- Keep deductions out of the prose (statistical noise, e.g. "highest at 12, 24 and 60 months"); keep technical detail in the methods notes.
- Add the "selection bias" wording under "Who posts".
- Arrears for SG Fleet is an inference from the numbers, not printed; the article says so.
- The artifact (old version) is retired; the owner deletes it themselves (`/artifacts`, press `d`).

## 6. Findings that shaped the current numbers (so you do not redo them)

- The first-pass Sonnet batches only sent images that passed a keyword filter, so many payment pages were never read. About 290 posts were re-read in full; a second independent read then verified quotes OCR could not parse (Paywise, NLA, Autopia, Maxxia layouts). Leaving those out had understated the median (it was 9.0%; now 9.7%).
- 446 gallery images are dead (the posters deleted them; confirmed on live Reddit). Only gallery items with `status: unprocessed` in the archive can still be fetched from `https://i.redd.it/<media_id>.jpg` (e.g. post `1r6ttc2`, second image). Not downloaded yet; the owner must say yes.
- SPA, Positive Salary Packaging and some unnamed fortnightly quotes had a misread "amount financed"; fixed by the residual rule above (SPA now sits about 1 point above its printed rate).
- Fortnightly quotes reproduce printed rates less often (about 47%) than monthly ones (about 85%); remaining gaps are mostly 0.5 to 1 point and look like per-provider fee differences (Alliance runs 0.5 to 1.1 above its printed rate). Not investigated further.
- Queensland back-derivation (7 quotes): printed base rates 7.29 to 8.61% (median 7.80%), commission +0.65 pp, timing +0.16 pp. This supports the "7 to 8%" benchmark section.
- A Smart Leasing quote posted by the poster in a comment (`p4eyn4h`, same quote as post `1vrnb8f`) computes to 9.3 to 10.3% against a printed 7.18% effective rate, and is dropped by the 2-point screen. Smart Leasing is about 125 quotes; the owner has not yet said how financed insurance is repaid. This is the largest unresolved accuracy question.
- `1nid7gk` (LeaseLab, 12 months, weekly payment) comes out at 16.6%, which looks high; not checked against the LeaseLab guide.

## 7. Open items, most useful first

1. **Owner answers pending on 11 older review cards** (Driva `1xc4d6w`, `1xr5coj`, `1vfxcqr`; LeaseLab `1pzysjl`, `1m8qb7m`; Paywise `olpjdx5`; NLA `1wyplra`; Kooya `1oo1g28`; ORIX `1nxhonw`, `1mgh5br`; SG Fleet `1vlfbew`). They check my provider handling against the owner's guides. Server and data: `private/quote-review-2026-11/rate-review/` (`server.py`, port 4330, answers in `responses.json`; 12 answers already processed).
2. **Smart Leasing financed add-ons** (section 6, `p4eyn4h`): decide how the financed insurance enters the amount financed, then re-run.
3. Suspicious Paywise quotes `1ta0k2h` (15.9%) and `1w34xsx` (21.5%, "Sample - Paywise").
4. Download the 2 unprocessed gallery images (ask the owner first).
5. Spot checks the owner may want: the 23 automatically merged quotes, the 15 quotes dropped for conflicting with their printed rate, the 25 to 31 single-read quotes left out.
6. Possibly add a first step to the flow chart for images deleted before they could be read (recount for r/NovatedLeasingAU only).
7. Decide whether to add a 7.5% or 7.8% benchmark line.

## 8. Before publishing

- Remove the `DRAFT` banner. It also contains a private folder path, which must not go to the public repo or site: delete the "Source: private rate study (...)" line.
- Link the article from the costs-and-savings index and navigation (`new-site/src/data/navigation.ts`); check wording against the UI copy rules (short main text, nuance in tooltips, no over-assertive claims); check light and dark mode and phone width (the tables scroll horizontally; the flow chart scales down and is small on a phone). I never saw the page rendered (no browser was available), so a visual pass is needed.
- The Sources section links to Reddit post and comment URLs only (no consultants' names). The review pages and images under `private/` contain consultants' names and contact details and must stay local.
- Do not push until the owner says so. Deploy is by push to `main`; Cloudflare caches static files for 10 minutes.

## 9. Gotchas

- `private/` is a symlink to iCloud and git-ignored: anything there can be lost if iCloud misbehaves; `article_tools/` and `overrides.json` are the only hand-made pieces worth backing up.
- Reddit blocks curl and Chrome from here; use the Arctic Shift archive API (data in `private/quote-review-2026-11/data/`: `all.json` 2,623 posts, `image_comments.json` 506 comments with images).
- Reading a number off a compressed quote image is error-prone: a fortnightly Flare payment was misread ($828.82 instead of $628.82) and only caught because the budget lines did not sum to the total. Cross-check totals before trusting a figure.
- Sonnet agents hit the 5-hour usage limit once when 17 ran in parallel; run 5 to 7 at a time.
- Headless Chrome hangs on this machine (it clashes with the running profile); render images with Python/PIL instead.
