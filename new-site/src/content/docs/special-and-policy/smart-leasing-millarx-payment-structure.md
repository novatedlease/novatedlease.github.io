---
datePublished: "2026-06-21"
dateModified: "2026-11-12"
title: "Smart Leasing & MillarX — why their quoted figure needs adjusting"
description: Smart Leasing and MillarX quote a regular payment derived from the full lease term, but only a subset of those periods are actual finance payments to the financier. Entering their per-pay figure directly inflates the effective interest rate. Here is why, and how to correct it.
---

# Smart Leasing and MillarX — why their quoted figure needs adjusting in the calculator

If you have a quote from Smart Leasing or MillarX and enter its fortnightly payment directly into this calculator, the effective interest rate will come out higher than expected — often by more than 1%. This reflects a structural difference in how these two providers quote their payment amounts.

---

## How most providers structure their payments

Two separate parties are typically involved in each novated lease's financing arrangement: the novated lease provider (technically a salary packaging company) and a financier. While one company may be your novated lease provider, the source of finance is usually a separate bank — Westpac, CBA, and similar.

The underlying finance is usually structured with a 2-month deferral (occasionally 1-month). In other words, in a 5-year lease with 60 months duration, this is often structured as a 2-month deferred period where the lease begins but no payment is due to the financier, followed by 58 months of monthly commitment. This deferral is a structural design to account for delays in the starting weeks of the lease, where both remittance and accumulation of funds may lag behind the payment schedule.

Now assume the financier's monthly payment is $1,000 ex-GST[^1] for 58 months, or $58,000 total.

Many providers then spread that $58,000 over the entire 130 fortnights — that is, $58,000 ÷ 130 = $446.15 per fortnight ex GST. SG Fleet quotes, for example, show both figures: the per-pay "Lease rental" (spread this way) and the "Monthly lease rental … payable as 58 payments" (the financier's payment). Either works in Guided mode.

---

## What Smart Leasing and MillarX do differently

Both Smart Leasing and MillarX use a structure in which they collect finance payments as though you are paying across the full lease term (60 months in this example), even though the financier is only asking for 58 months. The excess is kept as a buffer for running costs.

**Smart Leasing** typically withholds 2 months' worth of payments as a reserve. Using the same $1,000/month example for a 60-month lease:
- The bank expects $1,000 × 58 = $58,000 in total finance payments.
- However, Smart Leasing collects $1,000 × 60 = $60,000 total from the employee.
- The $2,000 difference is not a true finance cost — it is held as a budget reserve.

**MillarX** withholds the same number of months as the deferral: 1 or 2 on the quotes we have seen. With a 1-month deferral:
- The bank expects $1,000 × 59 = $59,000 in total finance payments.
- However, MillarX collects $1,000 × 60 = $60,000 total from the employee.
- The $1,000 difference is not a true finance cost — it is held as a budget reserve.

With a 2-month deferral, MillarX's numbers work the same way as the Smart Leasing example above.

The budget reserve is used to cover any shortfall in the budgeted running costs. Any surplus at the end of the term is refunded to you.

:::note[Other providers (November 2026)]
Some other providers' quotes show a per-pay finance figure equal to the monthly payment × 12 ÷ 26, the same arithmetic as above. We haven't confirmed whether they also collect for the full term or what happens to the extra. If your quote shows a monthly payment, entering that in Guided mode avoids the question.
:::

---

## Why this inflates the effective interest rate in the calculator

This calculator models the true cost of the finance arrangement — the vehicle cost, interest, and residual. To do that accurately, it needs the figure that reflects **what is actually being paid to the financier**, not what is being deducted from your salary.

When you enter the quoted figure from Smart Leasing or MillarX directly, you are entering a number that is slightly higher than the true finance cost — because of the over-collection for the budget reserve. This inflated figure produces a higher effective interest rate than the genuine finance cost would.

The **monthly** figure is different. Smart Leasing's "Lease per month" and MillarX's "$X/mth × N" are the actual monthly payment to the financier ($1,000 in the example). In Guided mode, a payment entered per month is read as exactly that, so it needs no correction. Advanced mode still reads a monthly figure as spread over the whole term, like a fortnightly one, so there it needs the correction too.

The maths for the per-pay figure is straightforward. For a 5-year lease with Smart Leasing (2 buffer months):

> True finance figure = Quoted figure × (58 ÷ 60) = Quoted figure × 96.67%

Your quoted figure is ~3.45% higher than what the calculator needs. On a $600/fortnight quote, the correct figure is around $579.

For a shorter lease the effect is larger, because the buffer months represent a larger share of the term:

| Lease term | Smart Leasing buffer | Payment overstatement |
|---|---|---|
| 5 years (60 months) | 2 months | ~3.45% |
| 4 years (48 months) | 2 months | ~4.26% |
| 3 years (36 months) | 2 months | ~5.88% |
| 2 years (24 months) | 2 months | ~9.09% |

MillarX with a 1-month deferral (with 2 months, use the table above):

| Lease term | MillarX buffer | Payment overstatement |
|---|---|---|
| 5 years (60 months) | 1 month | ~1.69% |
| 4 years (48 months) | 1 month | ~2.13% |
| 3 years (36 months) | 1 month | ~2.86% |
| 2 years (24 months) | 1 month | ~4.35% |

These percentages represent the overstatement of the **payment figure**, not the direct difference in effective interest rate — though a payment overstatement of this magnitude does translate to a meaningful inflation of the back-calculated effective rate, typically 1% or more.

---

## The adjustment tool in the calculator

The calculator includes a built-in adjustment tool specifically for these providers.

- **Guided mode:** on the payment screen, answer **Yes** to "Is your lease with Smart Leasing or MillarX?" and use the **Open the correction tool** button that appears. If you're entering the monthly figure instead, choose **Per month** and type it as printed: no correction is needed.
- **Advanced mode:** click **"Smart Leasing / MillarX customer?"** above the vehicle lease payment field.

The tool opens a panel where you:

1. Select your provider (Smart Leasing or MillarX). For MillarX, also choose your deferral, 1 or 2 months
2. Enter your quoted figure (per fortnight or per month — both are supported)
3. Click **Use this value**, which puts the adjusted, finance-only figure into the calculator for you

The panel shows the scaling factor, the adjusted result, and an explanation of the buffer being applied.

:::note[Confirm your provider's specific buffer]
The tool uses 2 months for Smart Leasing, the most commonly reported structure, and your deferral for MillarX. Individual quotes may vary.
:::

### Reading a MillarX quote (November 2026)

- **Deferral:** newer MillarX quotes show a line such as "$819/mth × 58". The number of payments tells you the deferral: 58 payments on a 60-month lease means 2 months, 59 means 1.
- **Which figure to enter:** in Guided mode, the simplest is the "$X/mth" figure, entered per month as printed. The fortnightly payment is that monthly figure × 12 ÷ 26 and needs the correction. In Advanced mode, either figure goes into the tool and both give the same result.
- **"Finance + fee":** some MillarX quotes show the fortnightly payment as "Finance + fee". That figure includes the management fee. Take the fee out first (a monthly fee × 12 ÷ 26 per fortnight) and enter the fee with your running costs.

---

## Why the calculator total will look lower than your provider's quote

Once you apply the adjusted figure, you will notice that the calculator's total cost comes out slightly lower than the total your provider quotes for the same arrangement. This is expected.

Your provider's quoted total is calculated inclusive of the budget reserve — which overstates the true out-of-pocket cost, because that reserve is refunded to you if unused at term end.

**The figure in your provider's quote represents the cost before any reserve refund. This calculator models the cost net of it.**

The difference in total cost between the two figures is approximately:

> Buffer months × Monthly equivalent payment

For a Smart Leasing quote of $600/fortnight on a 5-year lease, this is roughly 2 × ($600 × 26 ÷ 12) ≈ **$2,600** — money that sits in a reserve and comes back to you if unused, not a genuine cost.

---

## Key takeaway

> Smart Leasing and MillarX quote a per-pay figure derived across the full lease term, but part of it funds a running-cost reserve rather than the financier. Entering it directly overstates the finance cost and inflates the effective interest rate. In Guided mode, enter the monthly figure per month (no correction needed), or run the per-pay figure through the **Smart Leasing / MillarX** correction tool before comparing rates or modelling outcomes.

---

## Related reading

- [Novated Lease Calculator](/calculator/)
- [Why effective interest rates look high](/costs-and-savings/why-nl-interest-looks-high/)
- [Effective rates on short leases and cheaper cars](/costs-and-savings/effective-interest-rate-short-leases-cheaper-cars/)

[^1]: All figures in this article are expressed ex-GST. In practice, GST is embedded in the amounts that change hands — the financier charges GST on the lease rental, and the employee's salary deductions include it. We use ex-GST figures throughout because, for most employees, the GST component is largely irrelevant to calculations:  employers and novated lease providers claim the input tax credit and pass it on, therefore the employee is usually not responsible for the GST component.
