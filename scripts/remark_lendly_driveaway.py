"""Move Lendly's drive-away marker (2) from "Price … Drive Away" to the two lines that add up to
the drive-away price used in Guided: "GST Tax Credit" + "Total Price (ex. GST)" (16 Nov 2026).

Works on the already-redacted published page. The old outline crossed the descender of "y" in
"Drive Away^", so those two printed words (no figures) are re-copied from the private source
screenshot. Run once, on the page as committed before 16 Nov 2026.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'docs/assets/images/quote-guide/lendly'
MANIFEST = ROOT / 'docs/assets/images/quote-guide/manifest.json'
page = Image.open(DIR / 'redacted-quote.webp').convert('RGB')
a = np.array(page).astype(int)

# Erase the old orange outline and blue number circle around the Price row (white background).
x0, y0, x1, y1 = 222, 572, 940, 618
reg = a[y0:y1, x0:x1]
r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
orangeish = (r - b > 60) & (r > 150)
bluish = (b - r > 40)
mask = orangeish | bluish
grow = mask.copy()
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        grow |= np.roll(np.roll(mask, dy, 0), dx, 1)
reg[grow] = 255
a[y0:y1, x0:x1] = reg
a[578:612, 196:229] = 255  # the circle and its white digit
page = Image.fromarray(a.astype('uint8'))

# Re-copy the printed words "Drive Away^" (source x 600-752, y 470-505; scale 1.236).
SRC = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11/templates/lendly/source.png')
words = Image.open(SRC).convert('RGB').crop((600, 470, 752, 505))
k = 173 / 140
words = words.resize((round(words.width * k), round(words.height * k)), Image.LANCZOS)
page.paste(words, (round(744 - 6 * k), round(583 - 5 * k)))

d = ImageDraw.Draw(page)
rect = (229, 657, 933, 746)
d.rounded_rectangle(rect, radius=5, outline='#ea6a29', width=3)
cx, cy, rad = 213, 701, 12
d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill='#15549a', outline='white', width=2)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 16)
box = d.textbbox((0, 0), '2', font=font)
d.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - box[1]), '2', font=font, fill='white')
page.save(DIR / 'redacted-quote.webp', quality=88)

crop = page.crop((185, 562, 960, 750))
crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
crop.save(DIR / 'field-driveaway.webp', quality=88)

m = json.loads(MANIFEST.read_text())
m['markers']['lendly']['driveaway'] = [{'label': '2', 'y': rect[1], 'h': rect[3] - rect[1]}]
m['images']['lendly/field-driveaway.webp'] = {'w': crop.width, 'h': crop.height}
MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print('Re-marked Lendly drive-away')
