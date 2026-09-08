# Brand sources

Editable sources for the site mark (single-line car with two stacked coins and a
note behind it) and the images generated from it. The shipped assets live in
`docs/assets/images/` (reached from the Astro app via the `public/assets` symlink).

| Source | Generates | Notes |
|---|---|---|
| `../../docs/assets/images/logo.svg` | itself | The mark, white on transparent. Knock-outs use SVG luminance masks, so it sits on any background. Used by `NavBar.astro` and `Footer.astro`. |
| `favicon.svg` | `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png` | Blue rounded tile, car line only (the full mark is unreadable at 16 px). |
| `apple-touch.svg` | `apple-touch-icon.png` (180×180) | Blue square tile with the full mark; iOS applies the rounding. |
| `logo-tile.svg` | `logo.png` (1200×630) | Navy tile with the mark, referenced by the schema.org publisher entry in `Base.astro`. |
| `og-default.html` | `og-default.png` (1200×630) | Dark editorial share image. |
| `bmc-cover.html` | `og-long.png` (1600×400) and the Buy Me a Coffee cover | Same design at the cover ratio. |
| `bmc-cover.dc.html` | — | The Claude Design canvas artboard the cover was drafted in. |

## Re-rendering

Everything rasterises with headless Chrome; no other tooling is needed.

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
IMG=../../docs/assets/images

# Share images (Inter loads from Google Fonts, hence the time budget)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1200,630 --screenshot="$IMG/og-default.png" "file://$PWD/og-default.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1600,400 --screenshot="$IMG/og-long.png" "file://$PWD/bmc-cover.html"

# Icons (screenshot each SVG at its own size with a transparent background)
for f in favicon apple-touch logo-tile; do
  w=$(grep -oE 'width="[0-9]+"' $f.svg | head -1 | tr -dc 0-9); h=$(grep -oE 'height="[0-9]+"' $f.svg | head -1 | tr -dc 0-9)
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=$w,$h --screenshot=/tmp/$f.png "file://$PWD/$f.svg" >/dev/null 2>&1
done
sips -Z 32 /tmp/favicon.png --out "$IMG/favicon-32x32.png"
sips -Z 16 /tmp/favicon.png --out "$IMG/favicon-16x16.png"
cp /tmp/apple-touch.png "$IMG/apple-touch-icon.png"
cp /tmp/logo-tile.png "$IMG/logo.png"
```

After changing `og-default.png` or `og-long.png`, bump the `?v=` suffix on the
`ogImage` default in `src/layouts/Base.astro` so Facebook and LinkedIn fetch the
new file instead of their cached copy, then re-scrape shared URLs in Facebook's
Sharing Debugger (https://developers.facebook.com/tools/debug/).
