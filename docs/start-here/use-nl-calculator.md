# How to Use the Novated Lease Calculator: Step-by-Step Guide

The [novated lease calculator](../calculator/index.md) helps you **compare the real-world costs and benefits of a novated lease** against practical alternatives such as paying cash, using a car loan, or keeping your current vehicle.

It is a fully web-based, interactive calculator. Results update automatically as you change inputs. Most fields include an information tooltip ⓘ — hover or tap for explanations, definitions, and common pitfalls.

---

## Step 1: Enter Basic Information (Left-Hand Input Panel)

Before starting, gather the following information about the vehicle and your personal finances.

### Vehicle details

- **Vehicle type**  
  Select **EV** or **non-EV**. Plug‑in hybrids should be entered as *non‑EV*, as they no longer qualify for FBT exemption from 1 April 2025 onward.

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

- **Vehicle lease (per fortnight)**  
  Enter the figure from your quote.  
  If you do not yet have a quote, a placeholder corresponding to an effective interest rate of **~8–12%** is a reasonable approximation for most mainstream providers.

- **Luxury Vehicle Adjustment (per fortnight)**  
  Only relevant for vehicles above the vehicle cost limit ($69,674 for FY2025–26).  
  This is an employer‑imposed accounting adjustment.  
  Further explanation is available [here](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf).

---

### Annual running costs

Include fuel or electricity, servicing, insurance, registration, tyres, and other expected costs.

- Use figures from your quote if you want the calculator’s outputs to match your lease exactly.
- Confirm whether your employer passes on GST savings.
- **Electricity** should be left at the default value, which is automatically calculated as **4.2 cents × annual kilometres**, in line with the [ATO’s standard EV electricity claim method](../running-costs/ato-42c-per-km-shortcut.md).  
    - If you will charge mostly at commercial charger and intend to claim actual commercial charging fees instead of the 4.2c/km method, you may enter the estimated commercial charging cost here (if it exceeds the amount derived using the 4.2c/km method).
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

## Other Features

- **Reset button**  
  Resets all inputs to default values (based on my own 2023 lease).

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

!!! info "Support this independent calculator & guide"
    This calculator and guide are provided free as an independent, unbiased educational resource — something that is surprisingly rare in the novated‑lease space.

    If it has helped you understand your options, avoid costly mistakes, or make a more informed decision, consider supporting ongoing development:

    - [Use my Tesla referral link](https://ts.la/chang705436) for a $350 discount when ordering a Tesla  
    - [Buy me a cuppa](https://buymeacoffee.com/changyang1230) ☕ to help cover hosting, development time, and future improvements