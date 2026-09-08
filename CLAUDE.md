# Novated Lease Guide — novatedlease.guide

Independent Australian novated lease calculator and reference guide. No
affiliation with any leasing company; no commissions, no leads sold.

## Layout

- `new-site/` — the Astro site that is deployed. `npm run build` inside it.
  `new-site/public/assets` is a **symlink to `docs/assets`**, so images and
  scripts under `public/assets/...` are committed as `docs/assets/...`.
- `docs/` — the published static tree (GitHub Pages) plus shared assets.
- `calculator/`, `calculator2/` — calculator code; see `CALCULATOR2_NOTES.md`.
- `FUTURE_WORK.md`, `SITE_REVIEW_2026-07.md` — backlog and the July 2026 review.

## Deploying

Push to `main`. `.github/workflows` builds `new-site` and publishes
`new-site/dist` to GitHub Pages; the change is live about 75 seconds later.
The site sits behind Cloudflare with a 10 minute cache on static files.

Do not commit `new-site/.astro/` (build cache).

## Design tokens (from `new-site/src/styles/global.css`)

- Fonts: Inter (body and headings), JetBrains Mono (labels, code).
- Brand blue `#0b5cab` (hover `#084a8c`); dark theme background `#0f141c`,
  surface `#171e2a`, border `#283142`, text `#e8ebf1` / soft `#c5cbd6`.
- Light theme background `#ffffff` / subtle `#f8f9fa`, text `#111827`.
- Radii: 4 / 8 / 12 px (`--radius-sm/md/lg`).
- The nav and footer are dark in both themes, so the logo is white.

## Brand mark and imagery (2026-09-08)

The original clip-art car-and-cash illustration was retired everywhere. The
replacement is a logo-style mark: a car drawn as one continuous rounded stroke
with calligraphic wheel arches that taper to a point, two stacked coin rings,
and a banknote outline behind them, knocked out where the car and coins cross
it. Deliberately no dollar sign; the coins and note carry the money cue.

Sources and the re-render recipe live in `new-site/brand/README.md`.

What changed in the repo:

- `docs/assets/images/logo.svg` (new) — the mark, white on transparent.
  `NavBar.astro` and `Footer.astro` now load it instead of `logo.png`.
- `docs/assets/images/logo.png` — regenerated as a 1200×630 navy tile with
  the mark; still referenced by the schema.org `Organization.logo` in
  `src/layouts/Base.astro`.
- `docs/assets/images/favicon.svg` (new), `favicon-32x32.png`,
  `favicon-16x16.png` — blue rounded tile with the car line only.
  `Base.astro` links the SVG first, PNGs as fallback.
- `docs/assets/images/apple-touch-icon.png` — blue tile with the full mark.
- `docs/assets/images/og-default.png` (1200×630) and `og-long.png`
  (1600×400) — redrawn in the "dark editorial" style: navy field with a faint
  dot grid, Inter 800 headline "Novated Lease Guide & Calculator", tagline
  "Compare net outcomes, not marketing claims.", two proof chips
  ("Independent", "No commissions, no leads sold"), mark bottom-right.
  "Quoted by ABC News" was intentionally dropped from the imagery.
- `src/layouts/Base.astro` — `ogImage` default now ends in `?v=2` so social
  networks fetch the new file. Bump the suffix whenever the OG images change.

Related, outside this repo:

- The Buy Me a Coffee page cover (buymeacoffee.com/changyang1230) uses the same
  1600×400 design as `og-long.png`. BMaC's stated cover size is 1600×400; on
  phones it crops toward the centre, so keep essentials away from the edges.
- The design was explored on a Claude Design canvas (four directions; "A · Dark
  editorial" chosen; alternatives kept on a second page):
  https://claude.ai/code/artifact/2e0d2c20-2767-40df-a048-8f776d11e7b1
- Facebook keeps its own cache of share previews for up to 30 days. After
  changing OG images, re-scrape shared URLs in the Sharing Debugger.
