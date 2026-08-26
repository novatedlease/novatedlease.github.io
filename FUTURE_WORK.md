# Future Work

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
