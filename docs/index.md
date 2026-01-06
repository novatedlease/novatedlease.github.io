# Novated leases — a practical reference guide

Since **2023**, I’ve been actively building and maintaining a **[free novated lease calculator](https://docs.google.com/spreadsheets/d/1CtpBXmuhRW3HrBjqJqnPeFhOfqCbPK-wXA17oz_1fuA/)** and participating in discussions across **Reddit, Facebook, and other online forums**. 

Over time, I noticed a pattern:

- the same misunderstandings repeat themselves in comment threads every single day
- people struggle to fully understand the trade-offs involved
- novated lease providers continue to benefit from the complexity of the structure and the resulting information asymmetry

Eventually, I found myself **copy-and-pasting the same blocks of text of explanations** in response to similar questions.

Rather than scattered comments and half-answers across multiple platforms, I have decided to build a **self-contained reference** that explains how novated leases actually work, including the parts that are often glossed over, misunderstood, or inconvenient to explain in short comments. 

This guide is 80% sourced from comments I have written over time [^1], with 20% freshly written to improve logical connections and flows between sections. 

---

## What this guide is (and is not)

This is **not** a novated lease sales site.

- I do not sell novated leases.
- I do not receive referral fees or commissions. [^2]
- I do not claim novated leases are “always good” or “always bad”.

This guide focuses on:

- **mechanics** — how novated leases actually function,  
- **numerical reality** — where savings come from, and where they are lost,  
- **risk and edge cases** — redundancy, write-offs, policy changes, and exit scenarios, and  
- **decision** — how to compare options properly, rather than relying on misleading figures like “tax saved”.

Many of the insights here come directly from:

- building and testing calculators,
- dissecting real quotes submitted by others,
- and witnessing people fall into some unfortunate and often avoidable traps.

---

## How this site is structured

The guide is organised so you can either **read linearly** or **jump straight to the section you need**. You could also use the search box to look up specific questions or topics. 

### Start here

Start here if you want a clear mental model:

- [what is a novated lease — really?](start-here/what-is-novated-lease.md)
- [who I am and how I became "that novated lease guy"](start-here/about-me.md)
- [FBT, RFBA, and adjusted taxable income — explained clearly](start-here/fbt-rfba-ati-explained.md)
- [general consideration of "is it right for me"](start-here/is-it-worth-it.md)

### Costs and savings

This section discusses some mechanisms underlying novated lease

- [why EV and ICE novated leases are functionally different products](costs-and-savings/ev-vs-ice-compared.md)
- [why “tax saved” is the wrong way to evaluate a novated lease](costs-and-savings/why-tax-saved-is-wrong.md)
- [why novated lease interest rates look high — and why that alone is the wrong question](costs-and-savings/why-nl-interest-looks-high.md)
- [a deep dive in residual values](costs-and-savings/why-residual-values-matter.md)
- [how to use the novated lease spreadsheet (and what it can and cannot tell you)](costs-and-savings/use-nl-spreadsheet.md)

### Running costs & claiming

Practical details about how running costs work in novated lease:

- [running cost budgets are a “piggy bank”](running-costs/running-costs-piggy-bank.md)
- [the ATO 4.2c/km EV charging shortcut — how it actually works](running-costs/ato-42c-per-km-shortcut.md)
- [failure to pass on GST savings — an overlooked cost in some novated leases](running-costs/failure-to-pass-gst-saving.md)

### Risks & exit strategies

The parts people often think about *after* it’s too late:

- [overview](risks/index.md)
- [lease length, residuals, and risk: choosing the right duration](risks/lease-length-and-risk.md)
- [what happens if a novated lease ends early - redundancy, job transfer, vehicle write-off etc](risks/early-termination.md)
- [early termination payouts: how bad can it get?](risks/how-bad-can-early-termination-get.md)

### Special cases & policy

Edge cases and policy-related issues:

- [overview](special-and-policy/index.md)
- [novated leases, adjusted taxable income, and childcare subsidy — a deep dive](special-and-policy/childcare-subsidy.md)
- [don’t double count the hospital / NFP FBT cap when judging a novated lease](special-and-policy/fbt-exemption-double-counting.md)
- [EV FBT exemption review timing — what is known, what is not, and why it matters](special-and-policy/ev-fbt-exemption-review-timing.md)
- [why novated leasing is poorly regulated](special-and-policy/why-poorly-regulated.md)


---

## How to use this guide

You don’t need to read everything.

However, if you do read most of it, you will likely be able to answer 95% of the typical novated lease questions you see on discussion forums.

Treat this guide as a way to **improve your knowledge base** — whether you’re talking to a novated lease provider, an accountant, or comparing options yourself.

---

## A final note

Novated leases can be beneficial in the right circumstances.  

They can also be expensive mistakes when misunderstood.

This guide is for educational purpose only. It does not intend to provide general or personal financial advice.

[^1]: I used some LLM assistance to help synthesise and organise ~70 of my old comments to form the backbone of these articles. Everything has been manually pored through and rewritten to keep my usual tone and way of explaining things, though you may still spot the occasional LLM-ish phrasing and the infamous em-dash. Note that LLM is only used to synthesise my own content rather than generating new content, so I am not introducing risk of hallucination or factual error. 

[^2]: The spreadsheet includes a 100% optional tipping jar and a Tesla referral link, which provides me with Tesla store credit if used when placing an order. Use of both is entirely optional, and the spreadsheet is freely available without restriction.