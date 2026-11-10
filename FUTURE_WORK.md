# Future Work

## SEO and content to-do (parked 2026-11-10)

Done on 2026-11-10: sitemap fixed (robots.txt → sitemap-index.xml, lastmod from
git dates, old sitemap.xml removed in Search Console); "Is it worth it?" meta
description rewritten; question-style headings on four articles; WebApplication
structured data on /calculator/. **Check results in early December 2026**
(Search Console: CTR on /start-here/is-it-worth-it/, positions for "can you pay
out a novated lease early", "how much is the residual on a novated lease", "how
much can I save with a novated lease", "can employer claim gst on novated lease").

Still to do, in order:
1. **Publish the Smartleasing real example** (local, uncommitted:
   `new-site/src/content/docs/costs-and-savings/real-example-smartleasing-21000-cheaper.md`,
   images in `docs/assets/images/smartleasing-example/`, `.quote-evidence` style
   in `global.css`). Needs the reader's answers: did he ask for the accessories
   and small-damage cover in quote 1, and what made up its $79,267 amount
   financed? Plus a decision on the $612 vs $632 per-fortnight gap, the "Partly"
   wording on the extras row, and the tint price ($840 vs ~$560 from the FBT base).
2. **"What changes on 1 April 2027" page** when the EV FBT wind-back legislation
   passes or nears it ("is the ev fbt exemption ending?" searches are rising).
3. **Links and mentions:** another guest post or two (FIRE blogs, The Driven,
   doctors'/nurses' publications); ask journalists to name or link the site.
4. Optional: "The catch that existed for decades: FBT" heading in
   what-is-novated-lease.md could read "...FBT on a novated lease" (Google sends
   FBT searches to the glossary/RFBA pages instead). Decided against a separate
   FBT article: it would only repeat what-is-novated-lease.
5. Calculator: floating results bar for phones in Advanced mode (re-check phone
   vs desktop calculator completion with Guided mode first).

## Hosting: consider moving off public GitHub Pages

Currently deployed via GitHub Actions (`.github/workflows/publish.yml`) using
`peaceiris/actions-gh-pages`, which requires the repo to stay public for GitHub
Pages to work on the free plan.

Concern: repo is public, so anyone who finds it (even without it being linked
from the site) can copy the calculator source code. There are a lot of AI-slop
novated lease calculator clones out there.

Options considered:
- **Cloudflare Pages** — connects to GitHub via their GitHub App (repo-level
  grant), so it can build from a **private** repo on the free tier. Custom
  domain (`novatedlease.guide`) would move over via DNS/CNAME. Would replace
  the current GH Actions + `peaceiris/actions-gh-pages` deploy step.
- **GitHub Pro (~$4/mo)** — lifts the "Pages requires public repo" restriction,
  so the existing workflow could stay as-is with the repo turned private.

Caveat either way: this is a client-side React app, so the bundled/minified JS
still ships to every visitor's browser regardless of repo visibility — it
raises the bar for copying (no more browsing source on GitHub) but doesn't
make the calculator logic unreadable to a determined person inspecting the
live site.

Decision: not yet made — revisit later.
