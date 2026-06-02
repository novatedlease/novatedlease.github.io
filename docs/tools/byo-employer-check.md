---
title: BYO / Self-Managed Novated Lease — Employer Checker
description: Check whether your employer allows BYO (self-managed) novated lease finance. A community-maintained database of confirmed employer policies.
hide:
  - navigation
  - toc
---

# BYO / Self-Managed Novated Lease — Employer Checker

<style>
.byo-explainer {
  margin: 16px 0 24px 0;
  padding: 14px 16px;
  border: 1px solid rgba(0, 100, 200, 0.25);
  border-left: 4px solid #2b6cb0;
  border-radius: 8px;
  background: rgba(43, 108, 176, 0.05);
  font-size: 0.92em;
  line-height: 1.6;
}

.byo-search-wrap {
  margin: 20px 0 16px 0;
}

#byo-search-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1em;
  font-family: inherit;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
  color: inherit;
}

#byo-search-input:focus {
  border-color: #2b6cb0;
  box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.12);
}

#byo-search-input::placeholder {
  color: rgba(0,0,0,0.38);
}

.byo-result-card {
  margin: 12px 0;
  padding: 16px 18px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: white;
}

.byo-result-card__name {
  font-size: 1.05em;
  font-weight: 700;
  margin-bottom: 4px;
}

.byo-result-card__group {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.48);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.byo-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.88em;
  font-weight: 600;
  margin-bottom: 4px;
}

.byo-badge--possible {
  background: #e6f4ed;
  color: #1a5c36;
  border: 1px solid rgba(26, 92, 54, 0.2);
}

.byo-badge--partial {
  background: #fef7e0;
  color: #7a4f00;
  border: 1px solid rgba(122, 79, 0, 0.2);
}

.byo-badge--not-available {
  background: #fde9e9;
  color: #8c1c1c;
  border: 1px solid rgba(140, 28, 28, 0.2);
}

.byo-result-card__notes {
  margin-top: 10px;
  font-size: 0.88em;
  color: rgba(0, 0, 0, 0.62);
  line-height: 1.55;
}

.byo-no-results {
  margin: 16px 0;
  padding: 24px 20px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  text-align: center;
}

.byo-no-results__icon {
  font-size: 2em;
  margin-bottom: 8px;
  line-height: 1;
}

.byo-no-results__title {
  font-weight: 700;
  font-size: 1.05em;
  margin-bottom: 10px;
}

.byo-no-results__body {
  font-size: 0.9em;
  color: rgba(0, 0, 0, 0.62);
  line-height: 1.65;
  max-width: 540px;
  margin: 0 auto;
}

.byo-providers-wrap {
  margin: 32px 0 20px 0;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
}

.byo-providers-wrap__title {
  font-weight: 700;
  font-size: 1.0em;
  margin-bottom: 8px;
}

.byo-providers-wrap__disclaimer {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.52);
  margin-bottom: 14px;
  line-height: 1.55;
  font-style: italic;
}

.byo-providers-wrap__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .byo-providers-wrap__grid {
    grid-template-columns: 1fr;
  }
}

.byo-provider-card {
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: white;
}

.byo-provider-card__name {
  font-weight: 700;
  font-size: 1.0em;
  margin-bottom: 4px;
}

.byo-provider-card__desc {
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.62);
  margin-bottom: 6px;
  line-height: 1.4;
}

.byo-provider-card__community {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 8px;
  line-height: 1.4;
}

.md-typeset .byo-provider-card__url {
  font-size: 0.82em;
  color: #2b6cb0;
  text-decoration: none;
  border-bottom: none !important;
  display: inline-block;
  margin-top: 2px;
}

.byo-contribute-box {
  margin: 20px 0;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.9em;
  line-height: 1.6;
}

.byo-db-count {
  font-size: 0.82em;
  color: rgba(0,0,0,0.45);
  margin-bottom: 4px;
}

.byo-how-it-works {
  margin: 24px 0;
  padding: 18px 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.65);
}

.byo-how-it-works h3 {
  margin-top: 0 !important;
}

.md-content__inner {
  max-width: 860px;
}
</style>

**Many employers technically permit BYO (self-managed) novated leases** — where you arrange your own financier rather than using the one bundled by your employer's salary packaging provider.

Self-managed leases often offer significantly more competitive effective interest rates than bundled arrangements — this alone can make a meaningful difference to the net cost of the lease over its full term.

**This option is frequently obscured or actively discouraged** by incumbent salary packaging companies, whose revenue includes a margin on bundled finance. In some cases, when asked directly, consultants have been known to deflect or misrepresent whether this option exists.

This page is a community-maintained record of confirmed employer policies.

<div class="byo-explainer">
  <strong>What is BYO / self-managed finance?</strong> You source your own finance independently, while your existing salary packaging company continues to handle payroll deductions and FBT administration as normal. The financing and the administration are handled by two separate parties.
</div>

<div id="byo-checker-root">
  <div class="byo-search-wrap">
    <input type="text" id="byo-search-input" placeholder="Type your employer name (e.g. South Metro Health, Monash Health, NDIA…)" autocomplete="off" spellcheck="false">
  </div>
  <div class="byo-db-count" id="byo-db-count"></div>
  <div id="byo-results-area"></div>
</div>

<div id="byo-providers-section"></div>

<div class="byo-how-it-works" markdown="1">

### How it works in practice

The key thing to understand is that two parties are involved in a BYO lease, each handling a separate role:

- **BYO finance specialist** — sources and arranges the actual finance through their lending panel (think: a mortgage broker, but for your novated lease)
- **Your existing salary packaging company** (e.g. Paywise, Smartleasing) — continues handling the payroll deductions and FBT administration as normal

These two sides operate independently. Your packaging company does not need to initiate or approve the finance; they simply process the salary deductions once the lease is in place.

**The process typically looks like this:**

1. **Contact a BYO specialist directly.** Provide your vehicle details, preferred lease term, annual kilometres, income, and postcode. The specialist generates a quote showing your fortnightly cost and effective interest rate.

2. **Review the quote.** Compare the rate against what your packaging company would offer. Rates vary based on your credit profile — good income, assets (e.g. a home you own), and low debt generally improve what the lender will offer.

3. **Submit a credit application.** If the quote looks competitive, the specialist runs a formal pre-approval through their lender panel.

4. **Receive approval.** Once approved, the financing is confirmed.

5. **Provide your dealer contact.** The specialist contacts your car dealer directly to request a tax invoice for the vehicle.

6. **Sign the lease documents.** The specialist prepares documents for both you and your employer to sign. Your employer's role is administrative — they're not arranging anything, just authorising the payroll deduction.

7. **Finalise the admin arrangement with your salary packaging company.** Using the documentation provided by the BYO specialist, you return to your existing salary packaging company (e.g. Paywise, Smartleasing) to set up the ongoing payroll deduction arrangement. They handle the FBT administration and fortnightly salary sacrifice from this point forward.

8. **The lease settles.** Your salary packaging company begins processing the deductions as normal. The BYO specialist's job is done.

</div>

<div class="byo-contribute-box">
  <strong>Know of another employer?</strong> If you have first-hand knowledge that your employer permits — or explicitly disallows — BYO finance for novated leases, <a href="/about/contact/">contact me</a> with details and I'll add it to the database.
</div>

<script src="/assets/javascripts/byo-check.js"></script>
