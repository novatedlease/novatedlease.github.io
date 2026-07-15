---
datePublished: "2026-04-02"
dateModified: "2026-06-30"
description: Why novated lease effective interest rates are higher on short lease terms and cheaper cars — explained through the fixed-dollar brokerage pricing practice used by financiers.
---

# Why effective interest rates are higher on short leases and cheaper cars

:::note[Disclaimer]
I do not have access to the actual financier's official mechanism and books. The below is knowledge I gained through conversations with industry insiders over time. I do not vouch for 100% accuracy and welcome any correction from those with industry knowledge.
:::

One of the more puzzling findings when people compare novated lease quotes is that **two customers at the same company, leasing similar cars, can end up with very different effective interest rates**.

The explanation lies in a pricing practice that is both common and poorly understood: the use of a **fixed-dollar brokerage**.

---

## How novated lease finance works under the hood

Strictly speaking, a novated lease finance arrangement is not a loan. It does not carry a true principal or interest figure in the financier's ledger. Instead, it is structured as a vehicle lease or rent, charged monthly by the financier (which may differ from your fortnightly or weekly payroll deductions).

The financing begins with a **financed amount**, which is normally calculated as:

> **Vehicle drive-away price + documentation fee[^1] − vehicle GST saving[^2]**[^3]

Using a 5-year (60-month) lease as an example:

- The first one or two months are typically a **deferred period** — the financed amount begins accruing interest but no lease payment is made yet.
- From the third month through to the sixtieth, **58 monthly lease payments** are made.
- On the final month, the closing balance equals the **residual value**.

Even though this is not a traditional loan, we can derive an **effective interest rate** — the closest approximation of "if we treated this as a loan, what interest rate would produce an amortisation schedule with the equivalent lease payments, starting from the financed amount and ending at the residual value?"

This derivation is shown in the calculator under **Details > Section 3: Effective Interest Rate > Amortisation Table**.

---

## How providers price the finance

Novated lease providers begin with a **base (wholesale) rate** set by their financier. This is, in effect, the rate at which the vehicle lease is calculated with zero profit margin on the financing side.

On top of this, providers apply a **brokerage** — essentially a commission for arranging the lease.

This is where pricing gets interesting:

> **Many novated lease providers apply a fixed dollar amount as brokerage per lease, regardless of the car's value or the duration of the lease.**

That single design choice has surprisingly large consequences for the effective interest rate.

:::note[Not all providers do this]
Some providers instead apply a **percentage-based brokerage** — for example, a fixed percentage of the financed amount. In that structure, a $40k car generates proportionally less brokerage than an $80k car, and a 1-year lease generates proportionally less than a 5-year lease. The distortion described in this article would not arise, because the brokerage scales naturally with the deal size and duration.

If your provider uses percentage-based brokerage, the effective interest rate should be roughly consistent across different car values and lease lengths — all else being equal.
:::

---

## Example 1 — Cheaper vs more expensive car

**Scenario:** $40k car vs $80k car, both on a 5-year lease, hypothetical 8% base rate, with the provider seeking $5,000 brokerage from each deal.

:::info[Try it yourself]
You can use the [novated lease calculator](/calculator/) to simulate these scenarios. Enter the respective car prices and adjust the interest rate to observe the effect on lease payments.
:::

At 8% base rate:

| Car value | Fortnightly lease at base rate |
|-----------|-------------------------------|
| $40,000   | $278.24                        |
| $80,000   | $559.47                        |

To recover $5,000 brokerage across 130 fortnights (5 years), the provider adds **$38.46 per fortnight** to each lease.

| Car value | Post-brokerage fortnightly lease        | Effective interest rate |
|-----------|-----------------------------------------|-------------------------|
| $40,000   | $278.24 + $38.46 = **$316.70**          | **11.85%**              |
| $80,000   | $559.47 + $38.46 = **$597.93**          | **9.93%**               |

**Observation:** Both customers generate the same $5,000 brokerage for the provider — yet the $40k car buyer faces an effective rate nearly 2 percentage points higher than the $80k car buyer. The same fixed-dollar brokerage hits smaller deals proportionally harder.

---

## Example 2 — Shorter vs longer lease

**Scenario:** $40k car on a 1-year vs 5-year lease, same hypothetical 8% base rate[^4], with the provider seeking $5,000 brokerage from each deal.

:::info[Try it yourself]
You can use the [novated lease calculator](/calculator/) to simulate these scenarios. Adjust the lease duration and interest rate to observe the effect on lease payments.
:::

At 8% base rate:

| Lease duration | Fortnightly lease at base rate |
|----------------|-------------------------------|
| 1 year         | $579.58                        |
| 5 years        | $278.24                        |

To recover $5,000 in brokerage:

- Over 26 fortnights (1 year): add **$192.31 per fortnight**
- Over 130 fortnights (5 years): add **$38.46 per fortnight**

| Lease duration | Post-brokerage fortnightly lease          | Effective interest rate |
|----------------|-------------------------------------------|-------------------------|
| 1 year         | $579.58 + $192.31 = **$771.89**           | **23.99%** (!!)          |
| 5 years        | $278.24 + $38.46 = **$316.70**            | **11.85%**              |

**Observation:** Both customers generate the same $5,000 brokerage — yet the 1-year lease buyer faces an effective rate of nearly 24%, compared to under 12% for the 5-year lease. The math is brutal on short leases because the fixed cost is spread across far fewer payments.

---

## Why this matters

These examples illustrate a structural issue in how many novated lease providers price their finance:

- **The same company** can produce wildly different effective interest rates depending on the car value and lease duration.
- Customers comparing headline rates across providers — or even across quotes from the same provider — may be comparing fundamentally incomparable figures.
- People who choose shorter leases (often to reduce risk or manage vehicle turnover) face **proportionally worse** brokerage-related cost.

There is also an ethical dimension worth noting. Whether it is reasonable for a provider to seek the same dollar amount from a 1-year lease vs a 5-year lease — or from a $40k car vs an $80k car — is a question I will leave to the reader.

What is clear is that the [effective interest rate](/costs-and-savings/why-nl-interest-looks-high/), while an imperfect metric, can vary dramatically based on factors that have nothing to do with the borrower's credit risk or market conditions. It reflects pricing decisions made by the provider — and those decisions are not explained upfront.

---

## Key takeaway

> **If you are leasing a cheaper car or taking a shorter lease, expect the effective interest rate to be proportionally higher — even with the same provider and the same advertised rate.**

The most reliable way to compare quotes is not to look at the headline rate, but to model the **full net financial outcome** using a consistent methodology with [the novated lease calculator](/calculator/). 

---

[^1]: The financier's fee to set up the finance, typically capitalised into the financed amount.
[^2]: Equal to 1/11 of the vehicle's pre-on-road price, up to $6,353.
[^3]: Some providers also include additional items in the financed amount — such as the first year's comprehensive insurance premium, a repair package, or the brokerage itself — which further complicates comparisons.
[^4]: In practice, financiers often apply different base rates for different lease durations. A common base rate is used here to isolate the effect of brokerage on the effective interest rate.
