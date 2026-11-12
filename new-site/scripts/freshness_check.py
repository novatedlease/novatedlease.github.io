#!/usr/bin/env python3
"""Monthly quote-format freshness check (issue 20).

Pulls new r/NovatedLeasingAU posts from the Arctic Shift archive, downloads their quote images,
OCRs them, works out the provider, and flags providers whose newest quote no longer shows the
labels our Guided hints rely on. Writes reports/freshness-YYYY-MM-DD.md. Never edits site files.

Run with QUOTE_REVIEW_ROOT pointing to the private quote-review directory:
  QUOTE_REVIEW_ROOT=/path/to/quote-review python3 new-site/scripts/freshness_check.py
Needs: curl, tesseract. Python's urllib fails SSL on this Mac, so we shell out to curl.
"""
import argparse, collections, glob, html, json, os, re, subprocess, sys, time

ROOT = os.environ.get("QUOTE_REVIEW_ROOT")
if not ROOT or not os.path.isfile(os.path.join(ROOT, "data", "all.json")):
    raise SystemExit("Set QUOTE_REVIEW_ROOT to the private quote-review directory with data/all.json")
DATA = os.path.join(ROOT, "data", "all.json")
OCR = os.path.join(ROOT, "ocr")
REPORTS = os.path.join(ROOT, "reports")
API = "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=NovatedLeasingAU&limit=100"
UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36"

# Provider names as they appear on quotes or in posts. Order matters only for display.
PROVIDERS = {
    "Smart Leasing": r"smart ?leasing", "SG Fleet": r"sg ?fleet|sgfleet|vehicle salary sacrifice",
    "Maxxia": r"maxxia", "RemServ": r"rem ?serv", "Smartsalary": r"smart ?salary|smart ?drive",
    "Remunerator": r"remunerator", "Easi": r"\beasi\b|easifleet", "Fleetcare": r"fleet ?care",
    "Alliance": r"alliance leasing", "NLA": r"novated ?lease ?australia|nla\.com",
    "Toyota Fleet": r"toyota fleet|fleet management.{0,20}toyota", "FleetPartners": r"fleet ?partners",
    "LeasePlan/Ayvens": r"lease ?plan|ayvens", "SPA": r"salary packaging australia",
    "Paywise": r"paywise", "Oly": r"\boly\b", "Driva": r"\bdriva\b", "Flare": r"\bflare\b",
    "RACV": r"\bracv\b", "Fingo/ALP": r"fingo|automotive lease packaging", "Autopia": r"autopia",
    "LeaseExpress": r"lease ?express", "MillarX": r"millar ?x", "Custom Fleet": r"custom ?fleet",
    "ORIX": r"\borix\b", "LeaseLab": r"lease ?lab", "Simplygreen": r"simply ?green",
    "Lendly": r"\blendly\b", "Vehicle Solutions": r"vehicle solutions", "Fleet Network": r"fleet ?network",
    "Selectus": r"selectus", "Novated Co": r"novated ?co\b", "Macquarie": r"macquarie",
}

# Labels our Guided hints and provider notes rely on (Nov 2026). A provider's newest quote missing
# all of them, or most of them, suggests a layout change. Regexes are lenient for OCR noise.
EXPECTED = {
    "SG Fleet": [r"monthly lease rental", r"payable as \d+ payments", r"on-?road cost"],
    "Smart Leasing": [r"lease per month", r"months deferred", r"residual (inc|incl)"],
    "MillarX": [r"/ ?mth ?[x×]", r"finance payments", r"deferr"],
    "Easi": [r"lease (per month|payment per month)", r"months deferred", r"drive away price"],
    "Alliance": [r"total lease payment \(finance payment\)", r"finance rate", r"residual value \(inc gst\)"],
    "Flare": [r"total on-?road price", r"fbt base value"],
    "Maxxia": [r"financed payments", r"total residual value", r"fbt base value"],
    "Remunerator": [r"lease payment \(exc.{0,3} ?gst\)", r"number of lease payments"],
    "FleetPartners": [r"finance rental", r"based on\s+\d+\s+months"],
    "Toyota Fleet": [r"vehicle price on-?road", r"\brent\b"],
    "Paywise": [r"lease payment", r"lease management"],
    "NLA": [r"lease payment \(fixed\)", r"residual payment\W*(ex|excl)\b"],
    "Smartsalary": [r"lease payment \(fixed\)", r"motor vehicle deductions"],
    "Driva": [r"residual value \(ex\.? gst\)", r"lease payment"],
    "RemServ": [r"lease term", r"residual value", r"fortnightly inclusions|servicing.{0,20}incidentals"],
    "LeasePlan/Ayvens": [r"fbt base value", r"finance payment", r"management fees"],
    "SPA": [r"total drive away price", r"novated lease repayments", r"fbt base value"],
    "Fingo/ALP": [r"finance repayment", r"residual payment", r"management fee"],
    "LeaseLab": [r"novated vehicle price", r"lease management", r"residual"],
    "Oly": [r"your oly novated leasing price|oly driveaway price", r"car lease payments", r"establishment fee"],
    "Autopia": [r"autopia setup fee", r"monthly rental details", r"luxury non.?deductible"],
    "ORIX": [r"lease rental", r"orix management fee", r"residual value"],
    "Custom Fleet": [r"total on road cost", r"lease rental", r"salary packaging fee"],
    "Simplygreen": [r"fbt base value", r"months deferred", r"total lease cost"],
    "Lendly": [r"price drive away", r"licen[cs]e fee", r"monthly running costs"],
    "Vehicle Solutions": [r"fbt base cost", r"finance lease", r"driveaway price"],
    "LeaseExpress": [r"value for fbt purposes", r"lease payments", r"leasexpress fee"],
}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def curl_json(url, tries=6):
    for t in range(tries):
        out = subprocess.run(["curl", "-s", "--max-time", "90", url], capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except ValueError:
            d = {"data": None, "error": out[:80]}
        if d.get("data") is not None:
            return d["data"]
        log(f"  retry {t + 1}: {d.get('error')}")
        time.sleep(5 + 5 * t)
    raise RuntimeError(f"Arctic Shift kept failing for {url}")


def pull_new(posts):
    newest = max((p["created_utc"] for p in posts.values()), default=0)
    got, after = [], int(newest)
    while True:
        batch = curl_json(f"{API}&sort=asc&after={after}")
        batch = [p for p in batch if p["id"] not in posts]
        if not batch:
            break
        got += batch
        after = int(batch[-1]["created_utc"])
        for p in batch:
            posts[p["id"]] = p
        time.sleep(2)
        if len(batch) < 50:
            break
    return got


def image_urls(p):
    out = []
    if re.search(r"i\.redd\.it|i\.imgur", p.get("url") or ""):
        out.append(p["url"])
    for m in (p.get("media_metadata") or {}).values():
        if (m.get("m") or "image").startswith("image") and m.get("s"):
            u = html.unescape(m["s"].get("u") or "")
            if u:
                out.append(u)
    out += [html.unescape(u) for u in re.findall(r"https://preview\.redd\.it/[^\s\)\]]+", p.get("selftext") or "")]
    return out


def image_dir_for(p):
    # One folder per posting month, alongside the original images-aug-nov-2026/.
    return os.path.join(ROOT, "images-" + time.strftime("%Y-%m", time.gmtime(p["created_utc"])))


def all_images(pid):
    return sorted(glob.glob(os.path.join(ROOT, "images-*", f"{pid}_*.jpg")))


def download(p):
    saved = []
    d = image_dir_for(p)
    os.makedirs(d, exist_ok=True)
    for n, u in enumerate(image_urls(p)):
        f = os.path.join(d, f"{p['id']}_{n}.jpg")
        if any(os.path.basename(f) == os.path.basename(x) for x in all_images(p["id"])):
            continue
        subprocess.run(["curl", "-s", "-A", UA, "-o", f, u])
        if os.path.exists(f) and os.path.getsize(f) < 2000:
            os.remove(f)  # 404 page or deleted-image placeholder
        elif os.path.exists(f):
            saved.append(f)
    return saved


def ocr(img):
    base = os.path.join(OCR, os.path.splitext(os.path.basename(img))[0])
    if not os.path.exists(base + ".txt"):
        subprocess.run(["tesseract", img, base], capture_output=True)
    try:
        return open(base + ".txt", errors="ignore").read()
    except OSError:
        return ""


def providers_in(text):
    return [k for k, r in PROVIDERS.items() if re.search(r, text, re.I)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-pull", action="store_true", help="skip fetching; just re-check what's on disk")
    ap.add_argument("--since-days", type=int, default=45, help="report window for 'new posts' when not pulling")
    a = ap.parse_args()

    posts = {p["id"]: p for p in json.load(open(DATA))}
    os.makedirs(OCR, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)

    if a.no_pull:
        cutoff = time.time() - a.since_days * 86400
        new = [p for p in posts.values() if p["created_utc"] >= cutoff]
    else:
        log("Pulling new posts…")
        new = pull_new(posts)
        json.dump(list(posts.values()), open(DATA, "w"))
        log(f"  {len(new)} new posts")

    new_imgs = {}
    for p in new:
        if image_urls(p):
            saved = download(p)
            if saved:
                new_imgs[p["id"]] = saved
    log(f"  {sum(map(len, new_imgs.values()))} new images from {len(new_imgs)} posts")

    # Provider per post, from OCR of every image we hold plus title/body.
    by_provider = collections.defaultdict(list)  # provider -> [(created_utc, id, ocr_text)]
    for pid, p in posts.items():
        imgs = all_images(pid)
        if not imgs:
            continue
        text = "\n".join(ocr(i) for i in imgs)
        image_providers = set(providers_in(text))
        post_providers = set(providers_in((p.get("title") or "") + " " + (p.get("selftext") or "")))
        # A post often compares several brands. Prefer the brand printed in the quote image;
        # use the post text only when OCR found none and it names exactly one provider.
        found = image_providers or (post_providers if len(post_providers) == 1 else set())
        for prov in found:
            by_provider[prov].append((p["created_utc"], pid, text))

    new_ids = {p["id"] for p in new}
    rows, flagged, first_seen = [], [], []
    for prov in sorted(by_provider, key=lambda k: -max(x[0] for x in by_provider[k])):
        items = sorted(by_provider[prov], reverse=True)
        ts, pid, text = items[0]
        n_new = sum(1 for x in items if x[1] in new_ids)
        exp = EXPECTED.get(prov)
        if exp:
            missing = [r for r in exp if not re.search(r, text, re.I)]
            status = "ok" if len(missing) < len(exp) / 2 else ("CHECK" if n_new else "older mismatch")
            if status == "CHECK":
                flagged.append((prov, pid, ts, missing))
        else:
            missing, status = [], "no labels on file"
            if n_new:
                first_seen.append((prov, pid, ts))
        rows.append((prov, time.strftime("%Y-%m-%d", time.gmtime(ts)), pid, len(items), n_new, status, missing))

    today = time.strftime("%Y-%m-%d")
    link = lambda pid: f"https://www.reddit.com/r/NovatedLeasingAU/comments/{pid}/"
    rel = lambda f: os.path.relpath(f, ROOT)
    L = [f"# Quote-format freshness check, {today}", ""]
    window = f"in the last {a.since_days} days" if a.no_pull else "since the last pull"
    L.append(f"Posts checked {window}: **{len(new)}**, with newly downloaded quote images: **{len(new_imgs)}**.")
    L.append("OCR is noisy: a CHECK flag means *look at the quote*, not that the format has definitely changed.\n")
    L.append("## Needs a look")
    if not flagged and not first_seen:
        L.append("- Nothing flagged.")
    for prov, pid, ts, missing in flagged:
        imgs = ", ".join(f"`{rel(i)}`" for i in all_images(pid))
        L.append(f"- **{prov}**: newest quote ({time.strftime('%d %b %Y', time.gmtime(ts))}) lacks expected labels "
                 f"{', '.join('`' + m + '`' for m in missing)}. [{pid}]({link(pid)}) · {imgs}")
    for prov, pid, ts in first_seen:
        L.append(f"- **{prov}**: new quote but no expected labels on file yet. [{pid}]({link(pid)})")
    L.append("\n## New posts with quote images")
    for pid, files in sorted(new_imgs.items(), key=lambda kv: -posts[kv[0]]["created_utc"]):
        p = posts[pid]
        provs = ", ".join(sorted(set(providers_in("\n".join(ocr(f) for f in files)))) or {"unidentified"})
        L.append(f"- {time.strftime('%d %b', time.gmtime(p['created_utc']))} · {provs} · "
                 f"[{(p.get('title') or '')[:70]}]({link(pid)})")
    if not new_imgs:
        L.append("- None.")
    L.append("\n## Newest quote per provider")
    L.append("| Provider | Newest | Post | Quotes held | New | Labels |")
    L.append("|---|---|---|---|---|---|")
    for prov, day, pid, n, n_new, status, missing in rows:
        L.append(f"| {prov} | {day} | [{pid}]({link(pid)}) | {n} | {n_new} | {status} |")
    out = os.path.join(REPORTS, f"freshness-{today}.md")
    open(out, "w").write("\n".join(L) + "\n")
    print(out)


if __name__ == "__main__":
    main()
