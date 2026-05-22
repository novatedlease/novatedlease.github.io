---
title: Novated Lease Calculator (Australia) – Compare Net Outcomes
description: Free independent Australian novated lease calculator. Compare EV and ICE options against cash purchase, car loan or keeping your current car — based on real net outcomes, not marketing tax claims.
hide:
  - navigation
  - toc
  - title
---

# Novated Lease Calculator (Australia)


Independent **Australian novated lease calculator** to compare novated lease vs cash purchase vs car loan vs keeping your current car, focused on your **real net financial outcome** — not just headline [“tax saved” figures that can be misleading](/costs-and-savings/false-saving-example/).

**Built and maintained** by an [independent Australian specialist doctor](/about/about-me/) with formal training in statistics and a competitive mathematics background — not affiliated with any financier or novated lease / salary packaging company.

<style>
  /* Reduce the top whitespace above the embedded calculator on this page */
  .md-content__inner {
    padding-top: 0.9rem !important;
  }

  /* Material adds vertical spacing around headings/first blocks; remove it here */

  /* Also tighten the main container a touch */
  .md-main__inner {
    padding-top: 0.6rem !important;
  }
  /* Bring the calculator higher on the page */
  .md-content__inner > h1 {
    margin-top: 0 !important;
    margin-bottom: 0.5rem !important;
  }

  /* Tighten the intro paragraph spacing */
  .md-content__inner > p:first-of-type {
    margin-top: 0.25rem !important;
    margin-bottom: 0.75rem !important;
  }

  /* Nudge the embedded app up */
  #nl-calculator-root {
    margin-top: 0 !important;
    min-height: clamp(1200px, 140vh, 1800px);
    position: relative;
  }

  #nl-calculator-root[data-loading="true"] {
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9)),
      linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02));
    overflow: hidden;
  }

  #nl-calculator-root[data-loading="true"]::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%);
    transform: translateX(-100%);
    animation: nl-calculator-placeholder-shimmer 1.8s infinite;
    pointer-events: none;
  }

  .nl-calculator-placeholder {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: 16px;
    padding: 16px;
  }

  .nl-calculator-placeholder__panel,
  .nl-calculator-placeholder__output {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.82);
  }

  .nl-calculator-placeholder__panel {
    min-height: 980px;
  }

  .nl-calculator-placeholder__output {
    min-height: 1160px;
  }

  @keyframes nl-calculator-placeholder-shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  @media (max-width: 900px) {
    #nl-calculator-root {
      min-height: 1700px;
    }

    .nl-calculator-placeholder {
      grid-template-columns: 1fr;
    }

    .nl-calculator-placeholder__panel {
      min-height: 760px;
    }

    .nl-calculator-placeholder__output {
      min-height: 880px;
    }
  }
</style>

<div id="nl-calculator-root" data-loading="true" aria-busy="true">
  <div class="nl-calculator-placeholder" aria-hidden="true">
    <div class="nl-calculator-placeholder__panel"></div>
    <div class="nl-calculator-placeholder__output"></div>
  </div>
</div>

<link rel="stylesheet" href="/assets/calculator/style.css" />
<script type="module" src="/assets/calculator/main.js"></script>

## How to use this calculator

Quick start below — or read the [full walkthrough](/start-here/use-nl-calculator/) for detailed guidance.

**If you have a quote:** Enter your vehicle price, lease details, annual kilometres, and financial details based on the quote. The calculator then models the cashflow, asset and liability over the lease period and compares your overall financial position across different funding options.

**If you do not have a quote:** Look up the vehicle’s base and drive‑away price online, estimate typical running costs, choose a lease term (1–5 years), and enter a fortnightly lease amount consistent with an effective interest rate of roughly **8–12%** (a common market range). This will give you a reasonable **ballpark estimate** of the overall financial outcome.

Unlike most novated lease calculators, the outputs focus on **net outcomes** — how much better or worse off you are overall — rather than isolated tax figures.

---

:::info[Support this independent calculator & guide]
This calculator and guide are built and continuously maintained as an independent project.

If it has helped you think more clearly, avoid a costly mistake, or saved you meaningful money, you're welcome to support its ongoing maintenance and improvements:

- [Buying me a cuppa](https://buymeacoffee.com/changyang1230) ☕ to help cover hosting, development time, and future improvements, or
- [Using a friend's Tesla referral link](https://ts.la/pradeep738043) for a $350 discount if you're ordering a Tesla — the referral credit goes to them, not me.
:::

:::note[I'm backing Dr Michael Keane's fight for salary packaging transparency]{.collapsible}
Workplaces with an exclusive salary packaging provider tend to have noticeably higher effective interest rates on novated leases — yet the commercial terms behind these exclusive arrangements are rarely disclosed to employees.

Dr Michael Keane, a Melbourne anaesthetist, is taking a Victorian health service to the Victorian Supreme Court to obtain the unredacted contract between the hospital and its exclusive salary packaging provider. The unredacted version may shed light on [alleged sign-on fees](https://www.news.com.au/finance/work/at-work/staff-pay-up-to-5-million-a-year-for-employers-salary-sacrifice-deal/news-story/f8118107cf3a4db79f81f3c117b38dd0) associated with exclusive access to hospital employees — an arrangement whose financial terms employees are rarely privy to.

To date, Dr Keane has personally spent around $15,700 pursuing this case, with further legal costs anticipated. I believe this matters to anyone in a workplace with an exclusive provider. If you agree, consider supporting his [<img src="/assets/images/gofundme-favicon.png" alt="GoFundMe" style="height:1em;vertical-align:middle;border-radius:3px;"> GoFundMe](https://www.gofundme.com/f/support-transparency-in-hospital-salary-packaging).
:::

---


## Frequently asked questions

### Does this calculator support the 75% EV FBT rule announced in May 2026?

Yes. The calculator fully supports [the new rules](/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/). These rules affect the EV FBT exemption and it automatically applies the correct FBT treatment based on the lease start date and vehicle value:

- **Leases starting before 1 April 2027** — existing rules apply (full FBT exemption up to the LCT threshold).
- **Leases starting 1 April 2027 – 31 March 2029 (transitional period)** — vehicles at or below $75,000 remain fully exempt; vehicles above $75,000 but at or below the LCT threshold attract 75% of full FBT (a 25% discount); vehicles above the LCT threshold attract full FBT.
- **Leases starting from 1 April 2029** — the 25% FBT discount applies to all eligible EVs at or below the LCT threshold.

No manual adjustment is needed — simply enter your lease start date and vehicle base value and the calculator will apply the appropriate rules automatically.

### How accurate is this calculator?

This calculator is the direct evolution of [a spreadsheet](https://docs.google.com/spreadsheets/d/1CtpBXmuhRW3HrBjqJqnPeFhOfqCbPK-wXA17oz_1fuA/) that has been in continuous public use for over two years. It has been widely shared, scrutinised, and informally peer-reviewed by financially literate users, with numerous edge cases tested and minor issues corrected over time.

This web-based version was not a direct port of the spreadsheet; instead it was rebuilt from first principles. Core components — e.g., income tax modelling, Medicare levy calculation, fortnight-by-fortnight opportunity cost modelling, and pre-tax to post-tax cashflow conversion were independently re-derived and implemented in a new calculation engine.

The outputs of this engine were then systematically verified against the original spreadsheet across a broad range of test scenarios. The two implementations match to the cent for all test cases.

No financial model of this complexity can claim absolute infallibility. However, given the independent re-derivation, cross-verification, and sustained public scrutiny, the mathematical integrity of this calculator is likely robust.

For those who value full transparency, [the original spreadsheet](https://docs.google.com/spreadsheets/d/1CtpBXmuhRW3HrBjqJqnPeFhOfqCbPK-wXA17oz_1fuA/) remains available and exposes the underlying formulae in full. You are welcome to audit the logic yourself. Note however that features developed after January 2026 — such as the 75% EV FBT rule, the post-4-year ECM base value reduction, and other refinements — are not reflected in the spreadsheet and exist only in this web calculator.

If you believe you have identified a genuine discrepancy, please feel free to [reach out](/about/contact/). Serious scrutiny is welcome.

### Does this calculator support fractional lease terms like 13 months or 25 months?

No. The calculator supports whole-year lease durations only (1–5 years), and this is a deliberate design choice rather than an oversight.

Fractional or non-integer lease durations introduce a cluster of ambiguities that are handled inconsistently between providers — and modelling them with false precision would likely produce misleading results:

- **Residual value:** The ATO’s residual percentages apply to whole years. How a provider treats a 13-month lease — whether using the 2-year residual table (65.63% → 56.25%), or interpolating a precise figure for 1.083 years — is [a genuinely contested question](/costs-and-savings/why-residual-values-matter/#how-is-the-residual-defined-for-13month-or-other-noninteger-lease-durations) with no uniformly applied answer.
- **Annual running costs:** Whether a 13-month lease should include one or two years’ worth of annual expenses (registration, insurance, servicing) is ambiguous. Providers differ.
- **Fortnight counts:** A 13-month lease spans approximately 28.2 fortnights, introducing rounding and timing differences.

If you need to model a non-integer term precisely, [the original spreadsheet](https://docs.google.com/spreadsheets/d/1CtpBXmuhRW3HrBjqJqnPeFhOfqCbPK-wXA17oz_1fuA/) exposes all underlying formulae and can be adapted for your own purpose.

As a practical guide to the incremental benefit: if the provider correctly interpolates the residual for the extra month (e.g. 1.083 years rather than 2 years), the real additional saving from one extra month beyond a 1-year lease is mainly the extra month of running costs paid with pre-tax dollars — plus an additional ~0.8% of the car’s value being funded pre-tax for that month. The residual controversy is the bigger modelling uncertainty by far.

### Why doesn’t this calculator display a “tax saving” figure?

You may notice that this calculator does not prominently display a single “tax saved” number — and that is deliberate.

Novated lease providers often emphasise tax savings because it is psychologically compelling. However, tax reduction is only one component of the overall financial equation. A novated lease may also involve higher effective interest rates, management fees, brokerage, GST interactions, and early‑termination risks. Focusing solely on “tax saved” can therefore be misleading as explained in [this explanatory article](/costs-and-savings/why-tax-saved-is-wrong/) and [a fully worked example](/costs-and-savings/false-saving-example/).

This calculator is designed to model **net financial impact** i.e. the change in your overall position, rather than isolate one attractive component of the transaction.

If you nevertheless wish to derive the income tax saving component, you may do so manually via:

`Output > Details > 1.2 Breakdown by Financial Years`

For each financial year, compare the “Income Tax + Medicare Levy” figures before and after the lease. The difference represents the income tax and Medicare levy reduction attributable to the novated lease.

Some quotes also advertise a “GST saving.” This typically consists of two parts:

- **Vehicle purchase GST saving** — found in `Details > Vehicle GST saved`
- **Running cost GST saving** — found in `Details > 1.1 Summary > Pre‑tax component > Running cost (vehicle lifetime)` (multiply this amount by 10%)

However, as emphasised throughout this website, individual tax or GST savings figures are not meaningful in isolation. The relevant question is not “How much tax did I save?” but rather “Am I financially better or worse off overall?”

The net outcome remains the only meaningful decision metric.

### Does it consider childcare subsidy, HECS, or Div 293 impacts?

Yes. For EV novated leases, the calculator estimates [the effect of the reportable fringe benefit amount (RFBA)](/special-and-policy/childcare-subsidy/) on adjusted taxable income, which can affect HECS repayments, childcare subsidy, and Division 293 tax.

### Is this calculator affiliated with any novated lease provider?

No. This tool is independent and is not affiliated with any novated lease company, financier, or employer salary‑packaging provider. While I have gotten to know some industry insiders through my online participation, I do not receive referral fees or kickbacks from any provider.

### What are the limitations of this calculator?

Like all financial models, this calculator is a simulation based on explicit assumptions. While care has been taken to make these assumptions realistic and transparent, there are important limitations to be aware of:

- **Primary endpoint is financial position at 5 years.** The model assumes that, under a novated lease, the residual value is paid out at the end of the lease. The conclusions may not apply if the residual is rolled over into a subsequent lease. Outcomes may also diverge beyond year 5, as vehicle depreciation, opportunity cost of funds (e.g. offset balances), and financing dynamics can change in both magnitude and direction from year 6 onwards.

- **Home loan interest rate is assumed to be constant** throughout the lease duration. If you wish to explore the effect of rising or falling interest rates, you can manually adjust the interest rate inputs to approximate different scenarios.

- **Offset account impact is calculated on a fortnightly basis.** In reality, home loan interest is typically calculated daily and charged monthly. The discrepancy introduced by this simplification should be small, but it is not zero.

- **Insurance premiums, registration, and maintenance costs are assumed to remain constant** over the lease term. In practice, these costs often change over time.

- **Residual value methodologies vary between leasing companies.** The approach used here reflects the most common industry practice, but it may not match every provider exactly.

- **Market value depreciation is interpolated for 1–4 year lease terms.** Depreciation rates for both EVs and ICE vehicles change over time, particularly for EVs where rapid technological evolution may accelerate depreciation. The default assumption of ~40% depreciation at 5 years may not remain valid in all market conditions, and users should apply judgment when modifying these assumptions.

- **Running costs are assumed to contain a uniform 10% GST component.** This is a simplification. Some real-world expenses contain substantially less GST (for example, vehicle registration). The model assumes GST is always 1/11 of the gross cost.

- **Tyre replacement frequency is not explicitly modelled**, and no separate tyre budget is included in the default running cost assumptions.

- **Income tax and Medicare levy calculations do not model partial Medicare levy reductions** for singles earning below $34,027. It is assumed that most users considering novated leasing fall above this threshold.

These limitations do not invalidate the calculator, but they do highlight why the outputs should be interpreted as *decision support*, not precise predictions. Sensitivity testing and judgment remain essential.

### Who is this calculator less suitable for?

While this calculator is designed to cover the most common novated lease scenarios faced by Australian employees, it may be less suitable or require extra interpretation for the following groups:

- **Very low‑income earners.** At lower income levels, the interaction between income tax, Medicare levy (including partial reductions), and means‑tested benefits can be more complex and less reliably captured by a generalised model.

- **People who frequently roll over novated leases.** This calculator models a *single lease cycle* and assumes the residual value is paid out at the end of the lease. If you routinely roll residuals into subsequent leases, your long‑term outcomes may differ materially from those shown here.

- **People who could otherwise claim work‑related vehicle use outside a novated lease.** If you are able to claim deductions for work use of a vehicle under a cash‑purchase or car‑loan pathway (for example via logbook or cents‑per‑kilometre methods), those alternatives may warrant separate modelling and comparison.

- **People considering associate leases.** Associate leases have distinct financial consequence that is not modelled here, and outcomes can differ significantly from standard novated leasing arrangements (and may be more advantageous for certain personal circumstances).

- **Company directors or business owners with access to alternative structures.** If you operate through your own company or trust and may be eligible for FBT‑exempt vehicle benefits or other business‑specific arrangements, this calculator may not fully capture the options available to you.

In these situations, the calculator can still provide useful context, but the results should be interpreted with additional caution and, where appropriate, supplemented with tailored advice.
