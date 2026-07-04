---
description: Step-by-step guide on how to use the independent novated lease calculator — input fields, key assumptions, common pitfalls, and how to interpret the results.
---

# How to use the novated lease calculator: step-by-step guide

The [novated lease calculator](/calculator/) helps you **compare the real-world costs and benefits of a novated lease** against practical alternatives such as paying cash, using a car loan, or keeping your current vehicle.

It is a fully web-based, interactive calculator. Results update automatically as you change inputs. Most fields include an information tooltip ⓘ — hover or tap for explanations, definitions, and common pitfalls.

### Simple mode vs Advanced mode

The calculator opens in **Simple mode** by default. You're asked just a handful of questions — vehicle type, approximate drive‑away price, your taxable income, lease term, and annual kilometres — and the calculator fills in the rest (running costs, lease rate, residual value, and more) using reasonable market assumptions. Every one of these assumptions is listed transparently under **"Assumptions we made for you,"** each with a tooltip explaining exactly how it was derived, so nothing is hidden.

Once you have a real quote, or want full control over every input and access to the deeper analysis (effective interest rate, take‑home pay impact, super guarantee effects, worst‑case early‑termination scenarios), switch to **Advanced mode** using the toggle at the top of the calculator. You can jump into Advanced mode at any point from Simple mode to refine or override any assumption with your own figures — the steps below describe Advanced mode's full set of inputs.

First time here? Click **"✨ New here? Take the quick tour"** for a short guided walkthrough of both modes. You can dismiss it permanently once you're comfortable with the calculator — it stays reachable afterwards from a link in the footer.

---

## Step 1: Enter Basic Information (Left-Hand Input Panel)

Before starting, gather the following information about the vehicle and your personal finances.

### Vehicle details

- **Vehicle type**  
  Select **EV** or **Petrol / diesel / hybrid**. Plug‑in hybrids should be entered as *Petrol / diesel / hybrid*, as they no longer qualify for FBT exemption from 1 April 2025 onward.

- **Vehicle condition**  
  Choose between *new*, *used (dealer sale)*, or *used (private sale)*.  
  This selection is important as it determines GST treatment and EV FBT eligibility.

- **FBT base value**  
  The value used for Fringe Benefits Tax calculations.  
  Often labelled as *vehicle value*, *vehicle RRP*, or *vehicle subtotal* (Tesla terminology).  
  If not explicitly listed, derive it by subtracting stamp duty, registration, and compulsory third‑party insurance from the drive‑away price.

- **Drive‑away price**  
  The total amount you would pay if purchasing the vehicle outright with cash.

- **Estimated market value at 5 years**  
  Even if your lease or loan term is shorter, the calculator requires a 5‑year estimate and will interpolate the value to your chosen end date.  
  This auto‑fills as ~40% of your drive‑away price while you type, until you manually override it with a more accurate figure (e.g. from a resale value guide).

---

### Your financial details

- **Total taxable income**  
  Your full taxable income across all sources, after deductions.

- **Home loan offset interest rate** 

    - If using a personal home loan offset: enter the actual loan interest rate.  
    - If using a investment property offset or savings account: enter the *post‑tax equivalent* interest rate (after marginal tax + 2% Medicare levy).  
    - If the cash source is non‑income‑producing: enter 0%.
    - If the cash would otherwise have been invested in other assets (e.g. shares): While you could use an estimated post-tax return for this calculation, I discourage doing so. Equity returns are highly variable over a 1–5 year horizon, and a fixed assumed return may create a misleading sense of precision. Properly modelling this would require incorporating negative-return scenarios, which is not supported in this calculator.


- **Super guarantee calculated from pre‑NL income**  
  This is usually **Yes**, but I strongly recommend confirming with payroll.  
  If your employer calculates super on post‑NL income, this can result in a substantial long‑term loss in super contributions.
  
---

### Lease details

- **Documentation fee**  
  Enter the amount shown on your quote, or $0 if not applicable.

- **Lease start date**  
  Automatically set to approximately one month from today's date.  
  This is used to accurately account for financial‑year and FBT-year boundaries.

- **Lease duration**  
  Select between 1 and 5 years. Fractional terms (e.g. 13‑month leases) are not supported.

- **Vehicle finance**  
  Enter the figure from your quote (toggle between per‑fortnight and per‑month display).  
  If you do not yet have a quote, a placeholder corresponding to an effective interest rate of **~8–12%** is a reasonable approximation for most mainstream providers.  
  Small ▲▼ arrows next to this field let you nudge the implied effective interest rate up or down by 0.1% at a time, recalculating the fortnightly figure live — handy for exploring "what if my rate were X%" without doing the maths yourself.  
  **Smart Leasing / MillarX customer?** These two providers quote a figure derived from the full lease term, but only a subset of those periods are actual finance payments — entering it directly inflates the effective interest rate the calculator computes. Use the **"Smart Leasing / MillarX customer?"** adjustment tool above this field to convert your quoted figure to the finance-only amount the calculator expects. See [why this adjustment is needed and how it works](/special-and-policy/smart-leasing-millarx-payment-structure/) for the full explanation.

- **Luxury Vehicle Adjustment (per fortnight)**  
  Only relevant for vehicles above the vehicle cost limit ($69,883 for FY2026–27).  
  This is an employer‑imposed accounting adjustment.  
  Further explanation is available [here](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf).

---

### Annual running costs

Include fuel or electricity, servicing, insurance, registration, tyres, and other expected costs.

- Use figures from your quote if you want the calculator’s outputs to match your lease exactly.
- Confirm whether your employer passes on GST savings.
- **Electricity** should be left at the default value, which is automatically calculated as **5.47 cents × annual kilometres**, in line with the [ATO’s standard EV electricity claim method](/running-costs/ev-home-charging-shortcut/). This figure re‑calculates live whenever you change annual kilometres, until you manually override it.  
    - If you will charge mostly at commercial charger and intend to claim actual commercial charging fees instead of the 5.47c/km method, you may enter the estimated commercial charging cost here (if it exceeds the amount derived using the 5.47c/km method).
    - In all other circumstances, do **not** enter your actual electricity expense here — that is handled separately in the subsequent Electricity section.

--- 

### Electricity section (for EV)

- Enter the **electricity tariff cost (AUD per kWh)** and the **vehicle efficiency (Wh/km)**. 
- If you are unsure, just leave it at the default value. 
- You could alternatively enter an "annual charging cost" if you have a more accurate estimate (e.g. if you frequently charge at commercial chargers). 

---

### General notes

- Pay close attention to whether values are **inclusive or exclusive of GST**.
- Ensure you enter **fortnightly vs annual figures** correctly.
- If your quote is monthly, convert to fortnightly by multiplying by 12 and dividing by 26.  
  **Do not divide by 2**, as this introduces inaccuracy.
- To convert fortnightly running costs to annual running costs, multiply by 26. 

---

## Step 2: Enable Optional Comparisons

By default, the calculator compares **novated lease vs cash purchase**.

You may optionally enable:

- **Compare with car loan**, or
- **Compare with keeping current car**

Once enabled, enter the additional required details for those scenarios.

---

## Step 3: Review the Summary Tab

The **Summary** tab provides a high‑level overview of outcomes across each pathway.

- Cashflow and liability positions are compared side by side.
- When comparing against keeping your current car, the vehicle asset value is included.
- If your lease or loan term is shorter than 5 years, you can choose whether results are evaluated at:
    - the 5‑year mark, or
    - the end of the lease/loan.

---

## Step 4: Review the Details Tab

The **Details** tab contains the full underlying breakdown:

- **Basic information**  
  Key derived figures such as amount financed and residual value.

- **Section 1 – Lease payments**  
  Pre‑tax deductions, take‑home impact, totals, and year‑by‑year breakdowns.

- **Section 2 – Financial summary**  
  Complete cashflow, asset, and liability modelling for each pathway.

- **Section 3 – Effective interest rate**  
  Back‑calculated interest rate implied by your lease, with optional amortisation schedule.

- **Section 4 – Adjusted taxable income**  
  Estimated ATI after novated leasing (relevant for HECS, childcare subsidy, Medicare levy surcharge, etc).

- **Section 5 – Super guarantee**  
  Quantifies potential super losses if contributions are calculated on post‑NL income.

- **Section 6 – Rate sensitivity check**  
  Sensitivity testing against a hypothetical lease priced at a wholesale finance rate (e.g. ~7% according to an industry insider). 

- **Section 7 – Early termination risk**
  Illustrates the worst-case additional cost if a novated lease ends early (e.g. redundancy), compared with buying the car outright with cash. A graph indicates the timepoint where early termination may result in novated lease being worse than cash purchase. 

---

## Step 5: Review the Compare Tab

While the Summary and Details tabs analyse **one scenario at a time**, the **Compare** tab lets you line up pathways from **multiple saved quotes** side by side — e.g. a novated lease arrangement on a $60k EV vs a cash purchase of a $30k petrol car.

- Requires at least **two saved quotes** first (see **Quotes** under Other Features below) — save each scenario you want to compare before switching to this tab.
- Each saved quote can contribute up to four pathway rows — **Novated Lease**, **Offset Cash**, and (if enabled on that quote) **Car Loan** and **Keep Old Car** — tick the checkboxes next to the ones you want in the comparison, up to 8 pathways at once.
- A **ranking table** shows the net cash-flow, asset, and liability position for each selected pathway at both the 5‑year mark and lease/loan end, so you can see at a glance which comes out ahead.
- A **detailed breakdown table** below it itemises exactly where the numbers come from for each pathway — lease/loan payments, running costs, charging delta (EV only), residual value payable, car asset value, and additional home loan interest accrued — useful when two pathways land close together and you want to see which line items are driving the difference.

---

## Other Features

- **Reset button**  
  Resets all Advanced‑mode inputs back to the same starting point Simple mode uses by default (a representative ~$65,000 EV, 15,000km/year, 5‑year lease).

- **Copy link**  
  Generates a URL containing your current inputs, useful for sharing with a partner or online forum.

- **Quotes**  
  Save and reload scenarios within the same browser and device.  
  To transfer between devices, use **Copy link** as a workaround.

---

## Important Tips and Common Pitfalls

- Lease payments are **not automatically generated** — always enter a real quote or realistic estimate.
- The estimated market value at lease end materially affects results — use a realistic assumption.
- Always include **all income sources and any pre-existing deductions** when entering taxable income.

---

## Final Notes

- This calculator is designed to provide **transparent, apples‑to‑apples comparisons**.
- Its accuracy depends on **reasonable assumptions and correct inputs**. You are solely responsible for incorrect inputs resulting in incorrect outputs.
- Treat the output as decision support, not financial advice.
- Consider other risks (job security, exit risk, subsidy impact, borrowing capacity) alongside the numbers.

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
