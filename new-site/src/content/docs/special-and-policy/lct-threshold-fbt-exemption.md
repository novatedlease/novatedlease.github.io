---
title: LCT Threshold & FBT Exemption
description: How the Luxury Car Tax threshold determines FBT exemption eligibility for EV novated leases — including how the threshold is calculated each year.
---

# LCT threshold & the FBT exemption

When people research EV novated leases, they quickly encounter the LCT threshold — a number that sounds technical but has very practical consequences. This page explains what it is, why it matters for FBT exemption eligibility, and how it is recalculated each year.

:::info[EV LCT thresholds at a glance]
| Financial year | Threshold | Status |
|---|---|---|
| 2025–26 | $91,387 | In effect now |
| 2026–27 | $91,661 | From 1 July 2026 |
| 2027–28 | $120,000 *(ZEV-only category)* | Committed; not yet legislated |

The $120,000 figure stems from the [Australia–EU Free Trade Agreement](https://www.dfat.gov.au/trade/agreements/not-yet-in-force/aeufta/key-outcomes-and-benefits) finalised in March 2026 and requires both FTA ratification and enabling legislation before it can take effect. Full details in the [policy changes section](#whats-coming-policy-changes-to-watch) below.
:::


---

## What is the luxury car tax?

The **Luxury Car Tax (LCT)** is a 33% tax levied on the GST-inclusive value of a car that exceeds a legislated price threshold. It is charged on top of GST, but only on the portion of the car's value *above* the threshold — not on the full price.

LCT applies when a car is:

- Sold by a GST-registered entity (typically a dealership or importer), **or**
- Imported by an individual

The tax is governed by the [*A New Tax System (Luxury Car Tax) Act 1999*](https://www.legislation.gov.au/C2004A00463/latest/text) (LCT Act).

---

## Two LCT thresholds

There are currently two separate thresholds:

| Category | 2025–26 threshold | 2026–27 threshold |
|---|---|---|
| **Fuel-efficient vehicles** | $91,387 | **$91,661** |
| **Other vehicles** | $80,567 | **$80,809** |

:::note[This page focuses on the fuel-efficient vehicle threshold]
For novated lease purposes, the threshold that matters is the **fuel-efficient vehicle** threshold, since this is what governs FBT exemption eligibility for zero-emission vehicles.
:::


The [*Treasury Laws Amendment (Tax Incentives and Integrity) Act 2025*](https://www.legislation.gov.au/C2025A00029) made two changes effective from **1 July 2025**:

1. **Definition narrowed**: The fuel-efficient vehicle definition tightened from ≤ 7L/100km to **≤ 3.5L/100km** combined fuel consumption (as rated under vehicle standards in force under the *Road Vehicle Standards Act 2018*). Zero-emission vehicles (BEVs, FCEVs) and most PHEVs with very low rated consumption continue to qualify; hybrids with higher combined figures that previously qualified may no longer.

2. **Indexation aligned**: Both thresholds (fuel-efficient and other vehicles) now use the same CPI series — the Motor Vehicles sub-group — for annual indexation.

:::info[Transitional provision]
For a car supplied or imported **before 1 July 2025**, the old ≤ 7L/100km definition still applies throughout its life. So an older hybrid that qualified under the previous definition is not retrospectively reclassified.
:::


---

## Why the LCT threshold matters for novated leases

This is the critical link: under the [*Treasury Laws Amendment (Electric Car Discount) Act 2022*](https://www.legislation.gov.au/C2022A00086), a car is only eligible for the FBT exemption if — among other conditions — **LCT has never been payable**. 

In plain terms: **if the car costs more than the LCT threshold, it is ineligible for the FBT exemption**, and the entire novated lease pre-tax saving disappears.

The relevant "cost" is the car's FBT **base value** — its GST-inclusive purchase price including accessories and delivery charges, but excluding registration and stamp duty. Crucially, the eligibility condition is that **LCT has never been payable** on that car at any point in its history, not merely that its current price sits below the threshold. A used EV that attracted LCT when sold new remains permanently ineligible, even if its resale price has since fallen below the threshold.

:::tip[Watch the delivery date]
If a car is ordered before 1 July but delivered after, it is assessed against the **new** financial year's threshold. For cars sitting close to the threshold, delivery timing can be the difference between qualifying and not.
:::


:::warning[PHEVs lost FBT exemption eligibility from 1 April 2025]
From **1 April 2025**, plug-in hybrid vehicles (PHEVs) are no longer eligible for the EV FBT exemption — only **zero-emission vehicles** (battery EVs and hydrogen fuel cell vehicles) qualify. This applies regardless of the car's price or whether it sits below the LCT threshold.

A PHEV may still benefit from the higher *LCT* fuel-efficient threshold (≤ 3.5L/100km), meaning no LCT is charged on purchase — but that does not restore FBT exemption eligibility. The two rules operate independently.
:::



---

## Historical LCT thresholds (fuel-efficient vehicles)

The EV FBT exemption was introduced for cars first held and used on or after **1 July 2022**. Here is how the relevant threshold has moved since then:

| Financial year | LCT threshold | Change |
|---|---|---|
| 2022–23 | $84,916 | — *(baseline at introduction)* |
| 2023–24 | $89,332 | +$4,416 |
| 2024–25 | $91,387 | +$2,055 |
| 2025–26 | $91,387 | Unchanged *(indexation factor < 1)* |
| **2026–27** | **$91,661** | **+$274** |

The threshold only increased modestly in 2026–27 (+$274), and was frozen entirely in 2025–26 — a reminder that the threshold is indexed to *vehicle price inflation*, which has been flat or slightly negative in recent years.

---

## How the threshold is calculated each year

The LCT threshold is not set arbitrarily — it is derived each year using a legislated formula. The legal basis is:

- **[s 25-1(5)](https://www.legislation.gov.au/C2004A00463/latest/text)** of the LCT Act — mandates annual indexation of the fuel-efficient car limit
- **[Subdivision 960-M](https://www.legislation.gov.au/C2004A05138/latest/text/2) of the ITAA 1997** — provides the indexation mechanism, specifically:
  - **s 960-270**: multiply the amount by the indexation factor; do not index if factor ≤ 1.000
  - **s 960-275(1)**: defines the indexation factor as a ratio of four-quarter CPI sums
  - **s 960-280(2)**: specifies the CPI series — the *motor vehicle purchase sub-group*

The ATO publishes a formal **[Luxury Car Tax threshold](https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds)** each year confirming the factor and resulting threshold.

### The algorithm

**Data source:** ABS CPI Catalogue 6401.0, Table 18 — *Index Numbers; Motor Vehicles; Australia*

**Step 1 — Calculate the indexation factor:**

1. Sum the four quarterly index numbers ending **31 March** of the *current* financial year (i.e. the June, September, December and March quarters)
2. Divide by the equivalent four-quarter sum ending **31 March** of the *prior* financial year
3. Round to **3 decimal places**
4. If the result is ≤ 1.000, treat it as 1.000 — the threshold **never decreases**

**Step 2 — Apply the factor:**

5. Multiply the current threshold by the indexation factor
6. Round to the **nearest whole dollar**

### 2026–27 worked example

Using ABS CPI data [released in late April 2026](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/mar-2026):

| Period | Quarters included | Index sum |
|---|---|---|
| Current year (Jun 2024 – Mar 2025) | 99.89 + 100.55 + 100.43 + 101.44 | **402.31** |
| Prior year (Jun 2023 – Mar 2024) | 100.86 + 100.06 + 99.93 + 100.09 | **400.94** |

> **Indexation factor** = 402.31 ÷ 400.94 = **1.003**
>
> **New threshold** = $91,387 × 1.003 = **$91,661**

:::success[2026–27 LCT threshold for fuel-efficient vehicles: **$91,661**]
This represents an increase of $274 from the prior year.
:::


---

## Can I still fund an EV above the LCT threshold on a novated lease?

Yes — you can still novate-lease an EV priced above the LCT threshold. However:

- The car will **not** qualify for the FBT exemption
- The novated lease will be structured as a standard (FBT-applicable) novated lease
- You will still receive some tax benefit (GST savings, pre-tax contributions to running costs), but the headline pre-tax salary sacrifice of the entire lease payment is significantly diminished, due to significant proportion of the lease now payable with post-tax dollars. 

For most employees, a novated lease on a car above the LCT threshold offers significantly reduced — though not zero — benefit compared to a fully FBT-exempt lease.

---

## What's coming: policy changes to watch

:::warning[New $120,000 ZEV threshold — committed but not yet law]
As part of the [Australia–EU Free Trade Agreement](https://www.dfat.gov.au/trade/agreements/not-yet-in-force/aeufta/key-outcomes-and-benefits) finalised in March 2026, the government has committed to creating a **new, separate LCT category for zero-emission vehicles (ZEVs)** with a threshold of **$120,000** (indexed annually). This would apply to **all ZEVs**, not just EU-origin vehicles.

If enacted, the practical effect for novated leases is significant: the FBT exemption eligibility ceiling would rise from ~$91,661 to $120,000, bringing more expensive EVs e.g. some additional 7-seaters into scope.

However, **this has not yet been legislated**. Two steps are required before it can take effect:

1. The A-EU FTA must complete formal ratification through both the Australian Parliament and European institutions (a process that can take up to 24 months from signing), and
2. Enabling legislation must be passed to amend the LCT Act

The measure is currently expected to take effect from **1 July 2027** at the earliest. Until then, the existing $91,661 threshold remains the operative ceiling for FBT exemption eligibility.
:::


:::warning[EV FBT exemption wind-back announced — 4 May 2026]
On 4 May 2026, the treasurer announced a phased wind-back of the EV FBT exemption across the next three FBT years. The LCT threshold continues to function as the hard eligibility ceiling for the remaining FBT concessions — but from 1 April 2029 onward, no new lease will be fully FBT-exempt. Existing leases entered prior to 1 April 2027 on eligible vehicles remain grandfathered.

See the [full announcement breakdown](/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/) for a complete scenario table and quantified financial impact analysis.
:::


---

## Key takeaways

- The **LCT threshold** acts as a hard eligibility ceiling for the **FBT exemption** on EV novated leases
- From **1 April 2025**, only **zero-emission vehicles** (BEVs and FCEVs) qualify for the FBT exemption — PHEVs are excluded even if they sit below the LCT threshold
- From **1 July 2026**, the threshold is **$91,661**
- The threshold is recalculated annually using a legislated CPI-indexation formula based on the Motor Vehicles sub-group of the ABS CPI
- It can only go up (or stay flat) — never down
- Cars priced *above* the threshold can still be novated, but lose the FBT exemption
- A **$120,000 ZEV threshold** is expected from **1 July 2027** under the A-EU FTA, pending ratification and enabling legislation

---

*Last updated: April 2026. ABS CPI data source: Catalogue 6401.0, Table 18. Legislative references: [ANTS(LCT)A 1999](https://www.legislation.gov.au/C2004A00463/latest/text) s 25-1; [ITAA 1997](https://www.legislation.gov.au/C2004A05138) Subdivision 960-M.*
