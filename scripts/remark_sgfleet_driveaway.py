"""Widen SG Fleet's drive-away marker (2) from "Vehicle on-road cost (incl. GST)" alone to that line
plus "Accessories (incl. GST)": Guided's hint adds the two, and the FBT base value includes the
accessories, so on-road cost alone can read lower than the base value (28 Nov 2026).

Works on the already-redacted published page and re-crops the drive-away example from it.
Run once, on the page as committed before 28 Nov 2026.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'docs/assets/images/quote-guide/sgfleet'
MANIFEST = ROOT / 'docs/assets/images/quote-guide/manifest.json'
page = Image.open(DIR / 'redacted-quote.webp').convert('RGB')
a = np.array(page).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# The old outline (x 936-1374, y 1746-1776) and the blue circle (x 898-932, y 1744-1777).
mask = np.zeros(a.shape[:2], bool)
box = (slice(1742, 1781), slice(932, 1379))
mask[box] = ((r - b > 60) & (r > 150))[box]
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
mask |= (xx - 915) ** 2 + (yy - 1761) ** 2 <= 20 ** 2
grow = mask.copy()
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        grow |= np.roll(np.roll(mask, dy, 0), dx, 1)
mask = grow

# Fill each erased pixel from the nearest kept pixel: up/down first (keeps the panel's left edge),
# then left/right (the outline's sides).
out = a.copy()
def nearest(y, x):
    in_circle = x < 934
    for k in range(1, 30):
        if in_circle or k <= 6:
            for p in ((y - k, x), (y + k, x)):
                if not mask[p]:
                    return a[p]
        if not in_circle:
            for p in ((y, x - k), (y, x + k)):
                if not mask[p]:
                    return a[p]
    return a[y, x]


for y, x in zip(*np.nonzero(mask)):
    out[y, x] = nearest(y, x)
page = Image.fromarray(out.astype('uint8'))

d = ImageDraw.Draw(page)
rect = (936, 1746, 1374, 1840)  # on-road cost (two lines) and Accessories; MDR starts at y 1848
d.rounded_rectangle(rect, radius=7, outline='#ea6a29', width=3)
cx, cy, rad = 915, (rect[1] + rect[3]) // 2, 17
d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill='#15549a', outline='white', width=2)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 23)
tb = d.textbbox((0, 0), '2', font=font)
d.text((cx - (tb[2] - tb[0]) / 2 - tb[0], cy - (tb[3] - tb[1]) / 2 - tb[1]), '2', font=font, fill='white')
page.save(DIR / 'redacted-quote.webp', quality=88)

crop = page.crop((880, 1690, 1400, 1845))
k = 1268 / crop.width
crop = crop.resize((1268, round(crop.height * k)), Image.LANCZOS)
crop.save(DIR / 'driveaway-example.webp', quality=88)

m = json.loads(MANIFEST.read_text())
m['markers']['sgfleet']['driveaway'] = [{'label': '2', 'y': rect[1], 'h': rect[3] - rect[1]}]
m['images']['sgfleet/driveaway-example.webp'] = {'w': crop.width, 'h': crop.height}
MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print('Re-marked SG Fleet drive-away', crop.size)
