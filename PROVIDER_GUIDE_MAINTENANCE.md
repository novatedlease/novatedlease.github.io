# Provider quote guides: monthly manual check

**Reminder:** In the first week of each month, check whether provider quote layouts have changed. This is a manual task; no Codex automation is scheduled.

1. On the Mac that holds the private quote archive, run:

   ```sh
   QUOTE_REVIEW_ROOT="/path/to/novatedlease-private/quote-review-2026-11" \
     python3 new-site/scripts/freshness_check.py
   ```

   The script needs `curl` and `tesseract`. It downloads new public posts into the private archive and writes `reports/freshness-YYYY-MM-DD.md` there. It does not edit the site.
2. Read the report. A **CHECK** means the newest quote needs visual review; OCR can misread labels. Compare its headings, payment period and GST basis with the relevant [provider guide](new-site/src/content/docs/start-here/provider-quote-guides.md). Also review any guide whose example is more than six months old, especially the August 2025 LeasePlan example.
3. If a layout changed, update the dated pointer in `calculator2/src/guided/providerGuide.ts`, the numbered article, and the redacted page and field crops. Remove customer details and amounts before adding images to Git. Run the calculator tests and both builds, then commit the changes.

Readers can report a changed layout through the **My quote looks different** link beside an opened sample in Guided mode. The [contact page](new-site/src/content/docs/about/contact.md#quote-layout-feedback) asks for changed labels or a fully redacted screenshot, without requesting a personal quote review.
