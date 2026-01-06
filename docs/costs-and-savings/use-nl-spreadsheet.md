# How to use the novated lease spreadsheet (and what it can and cannot tell you)

[The novated lease spreadsheet](https://www.reddit.com/r/AusFinance/s/VHJ25VpNKu) exists because most novated lease quotes are **hard to interpret**, even for financially literate people.

Lease providers tend to emphasise:

- “tax saved”, or
- take-home pay impact,

while obscuring:

- interest and fees,
- opportunity cost,
- residual value payable,
- and comparisons against realistic alternatives.

This spreadsheet is designed to **force everything into the open** and let you answer one question clearly:

> *Compared to my best realistic alternative, am I actually better off?*

The spreadsheet allows one to compare **NL vs cash**, **NL vs loan** or **NL-new-car vs keeping-current-car**. 

---

## What the spreadsheet is (and isn’t)

The spreadsheet is **not**:

- a novated lease quote generator,
- a marketing tool,
- or a guarantee that novated leasing will be worth it for you.

It **is**:

- a comparison tool,
- a sanity checker,
- and a way to surface hidden costs and trade-offs.

Its usefulness depends entirely on the accuracy of the input. 

---

## Do I need a novated lease quote to use this?

**Ideally, yes.**  

But **no — not strictly**.

The spreadsheet works best when you already have:

- a specific car,
- and an actual novated lease quote,

because that pins down the true financing cost.

That said, you can still use it *before* you get a quote to understand the **order of magnitude** of the decision.

(If you already have a quote, you can [jump ahead](#if-you-have-a-real-quote))

---

## “I don’t have a quote yet — how do I use this spreadsheet?”

This spreadsheet is **most accurate** when you already have a novated lease quote for a specific car.  

However, if you’re still in the exploratory phase and just want to understand whether novated leasing is even *plausibly* worthwhile, you can still use it as a rough guide.

Here’s how.

---

### Step 1: Get a car price (not a novated lease quote)

You don’t need a novated lease quote yet.

Just get the **price** for the car you’re interested in, for example from:

- Tesla  
- BYD  
- Kia  
- Hyundai  
- Polestar  
- or any dealer listing  

This gives you the baseline vehicle cost.

Two prices are important: 

- **FBT base value** which is "**vehicle value**" or "**vehicle RRP**" (terminology varies): If this is not obviously listed, it can also be derived by subtracting stamp duty, registration and compulsory third party insurance from the drive-away price. Tesla calls this "vehicle subtotal". 
- **Drive-away price** i.e. the total amount if you were to purchase the car with cash.  

Most websites should generate both figures. 

---

### Step 2: Fill out the spreadsheet (skip one cell)

Make a copy (**File > Make a copy**); this is the only way the spreadsheet would work. Due to the limitation of Google Sheets, **do not** request edit access (as this means you are accessing the public master version and all your edits would change it permanently). 

Open your copy of the spreadsheet and:

- choose the relevant calculator i.e. **main (EV)** or **main (non-EV)**
- fill out **all the orange cells** as usual  
- **skip** the cell labelled **“Vehicle Lease (Per Fortnight)”** for now  

Everything else can still be entered normally:

- lease duration (1 to 5 years),
- income,
- kilometres,
- predicted market value, 
- budgeted running cost etc. 

Be careful to enter reasonable budget for the running cost to [avoid forming false conclusions](../running-costs/running-costs-piggy-bank.md#when-the-wrong-budget-becomes-practically-problematic). 

---

### Step 3: Enter a *reasonable* interest-rate estimate

Go to "**Interest Rate Calculator**" tab. 

For **Step 1**: Choose "**Copy Main (EV)**" or "**Copy Main (non-EV)**". 

For **Step 2**: Choose "**Yes / Not sure**"

Scroll down to **Section 2: What if my effective interest rate is X**. 

This table shows the range of common "**effective interest rates**" on the market. Pick a relevant figure from "**Definition 1**" column (this is the most comparable definition across providers). 

From my experience helping dozens of people sanity-check quotes, very rough rules of thumb are:

- **~6–9%** → self-managed novated leases  
- **~9–12%** → reasonably priced novated lease providers  
- **~12–16%** → expensive novated lease providers  

Choose a figure and **copy** it.

---

### Step 4: Back-calculate the lease payment

Go back to your **main (EV)** or **main (non-EV)** tab. 

Paste the generated figure into the **“Vehicle Lease (Per Fortnight)”** orange cell you skipped earlier. Note that you need to paste the figure by **right click > paste special > values only**. 

---

### Step 5: Interpret the result correctly

You now get a **rough estimate** of what happens if you novate the car, compared to:

- paying cash,
- using a car loan,
- or keeping your existing car.

This is **not a quote**.

But it *is* good enough to answer questions like:

- “Are we talking a few thousand dollars, or tens of thousands?”
- “Is this obviously bad, or plausibly good?”
- “Is it even worth getting quotes?”

---

## If you have a real quote

The spreadsheet works best when you have a real quote. 

Fill out the orange cells - they are already annotated with self-explanatory notes. Make sure you enter **ALL relevant fields**. 

Browse the bottom "**Calculations**" section for calculated outcomes. 

The "**summary statements**" produce human-readable sentences for a high-level summary; while the other segments are detailed worksheet for you to pore through. 

The outcomes are presented as "in each pathway, what your **cashflow, asset and liability** look like at the end of five years". 

**Section 3: Adjusted taxable income** is easy to overlook but extremely important, as it estimates the impact on your means-testing figure on government subsidies and liability. This should be considered alongside the previous accounting. 

**Section 5: Effect on super guarantee** is also extremely important if your employer uses post-NL income to calculate your super contribution. It is important to double check with your employer - although uncommon, if your employer does use the post-NL income for this purpose, it could lead to some 1-2k loss per year in super contribution. 

## Common errors in using this spreadsheet

- When you use this spreadsheet to trial-run a few different quotes / lease duration, the vehicle lease (per fortnight) field needs to be filled out with precise quote figures from **each relevant quote**. It is **not** automatically generated. Some people unfortunately assume this to be an automatic field and kept this figure intact across different scenarios - which would produce totally wrong calculation. 

- The total taxable income needs to be the actual total taxable income (i.e. sum of all incomes minus all deductions) in order to produce correct tax calculation. If you work multiple jobs, you need to sum up these incomes. 

    - The reason is that if you have a 80k job and another 200k job, the tax outcome of spending 20k in lease payment is "dropping 280k to 260k" i.e. 45+2% bracket, rather than "dropping 80k to 60k". 

- Some quotes are given as monthly budgets rather than fortnightly, especially for those on monthly pay. In this case, you need to **convert** month to fortnight by **multiplying 12 then dividing by 26**. Dividing directly by 2 would produce significantly different outcome. 

- For packaged running cost, if you are only given a fortnightly budget, **multiply it by 26** to derive the annual cost. 

- If the car is a used car via **private sale**, there is no GST saving on the vehicle. Manually change the "**vehicle GST saved**" field in the calculation output to **0** to correct for this. 

- The "**estimated market value at 5 years**" is an important variable which could only be guesstimated. This is understandably tricky given the uncertainty surrounding current car market, especially for EVs. 


## The most common misuse of the spreadsheet

The spreadsheet does **not** answer:

> “Is novated leasing good in general?”

It answers:

> **“Is this novated lease, under these assumptions, better than my best alternative?”**

If you:

- compare against an unrealistic alternative,
- ignore residuals,
- ignore offset impact,
- or ignore exit risk,

you will be misled.

You also need to consider all other non-numerical risks (as explained elsewhere in this guide) to form an informed opinion on your candidacy for novated lease. 

---

## Final takeaway

If you remember nothing else:

> **The spreadsheet is a detailed modelling tool, but it relies on good understanding and accurate input for proper functions.**
