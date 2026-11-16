"""Rebuild the CarBon quote guide artwork from the private Reddit archive.

Source: Reddit post 1s8dvmb (Mar 2026), a one-page CarBon Leasing and Rentals quote. Only the
redacted, numbered WebP files written to docs/assets are publishable; the source JPG stays private.
Also updates the CarBon entries in docs/assets/images/quote-guide/manifest.json.
"""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw, ImageFont
import pytesseract
from pytesseract import Output

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11/images-2026-03/1s8dvmb_0.jpg')
OUT = ROOT / 'docs/assets/images/quote-guide/carbon'
MANIFEST = ROOT / 'docs/assets/images/quote-guide/manifest.json'
OUT.mkdir(parents=True, exist_ok=True)
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
REG = '/System/Library/Fonts/Supplemental/Arial.ttf'
SCALE = 0.5  # the source is 2483 px wide; publish at about 1240

im = Image.open(SRC).convert('RGB')
d = ImageDraw.Draw(im)
dark = im.getpixel((1500, 150))
light = im.getpixel((40, 430))
ink = (30, 30, 30)

# Customer name and contact block (already cross-hatched by the poster): plain header colour.
d.rectangle((1560, 25, 2483, 330), fill=dark)
# Title bar names the exact car: keep only the heading.
d.rectangle((0, 352, 2483, 512), fill=light)
title = ImageFont.truetype(BOLD, 46)
w = d.textlength('Novated Lease Quotation', font=title)
d.text(((2483 - w) / 2, 405), 'Novated Lease Quotation', font=title, fill=dark)
# Vehicle description and options: clear the lines, then redraw the labels only.
d.rectangle((195, 838, 1300, 1100), fill='white')
body = ImageFont.truetype(REG, 31)
for y, label in [(898, 'Fitted with the following options -'), (950, 'Range -'),
                 (1010, 'Colour -'), (1063, 'State of Registration -')]:
    d.text((203, y), label, font=body, fill=ink)

# Every remaining figure: blank words containing a digit or $.
data = pytesseract.image_to_data(im, output_type=Output.DICT, config='--psm 11')
for i, word in enumerate(data['text']):
    word = word.strip()
    if not word or not re.search(r'\d|\$', word):
        continue
    x, y, ww, hh = (data[k][i] for k in ('left', 'top', 'width', 'height'))
    if y < 340:  # logo
        continue
    if x > 1700 and 2880 < y < 2990:  # keep the generic "$5 monthly Fleet Card Fee" note
        continue
    d.rectangle((x - 6, y - 5, x + ww + 7, y + hh + 6), fill='white')

# The savings panel's figures sit on green, where OCR misses them: paint them out.
panel = im.getpixel((1450, 1700))
d.rectangle((2010, 1675, 2270, 2185), fill=panel)

MARK = ImageFont.truetype(BOLD, 38)
markers = {}


def mark(field, label, rect, cx=None):
    x0, y0, x1, y1 = rect
    d.rounded_rectangle(rect, radius=12, outline='#ea6a29', width=7)
    cx = cx if cx is not None else x0 - 38
    cy = (y0 + y1) / 2 if y1 - y0 < 120 else y0 + 34
    r = 36
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill='#15549a', outline='white', width=5)
    box = d.textbbox((0, 0), label, font=MARK)
    d.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - box[1]), label, font=MARK, fill='white')
    markers.setdefault(field, []).append({'label': label, 'y': round(y0 * SCALE), 'h': round((y1 - y0) * SCALE)})


# Labels match the calculator's field numbers.
mark('term', '3', (190, 696, 2045, 758))
mark('mileage', '11', (190, 696, 2045, 758), cx=2090)
mark('driveaway', '2', (1468, 916, 1945, 996))
mark('residual', '6', (190, 1160, 895, 1221))
mark('payment', '7', (190, 1521, 1338, 1583))
mark('running', '9', (190, 1589, 1338, 1801))
mark('fees', '10', (190, 1807, 1338, 1863))
mark('luxAdj', '8', (190, 2630, 1665, 2705))

page = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
page.save(OUT / 'redacted-quote.webp', quality=85)
crops = {
    'term': (110, 670, 2160, 790),
    'mileage': (110, 670, 2160, 790),
    'driveaway': (1380, 880, 2100, 1030),
    'residual': (110, 1130, 960, 1280),
    'payment': (110, 1415, 1365, 1600),
    'running': (110, 1415, 1365, 2300),
    'fees': (110, 1790, 1365, 2300),
    'luxAdj': (110, 2350, 1720, 2720),
}
images = {'carbon/redacted-quote.webp': {'w': page.width, 'h': page.height}}
for field, box in crops.items():
    c = im.crop(box)
    c = c.resize((round(c.width * SCALE), round(c.height * SCALE)), Image.LANCZOS)
    c.save(OUT / f'field-{field}.webp', quality=86)
    images[f'carbon/field-{field}.webp'] = {'w': c.width, 'h': c.height}

raw = MANIFEST.read_text()
m = json.loads(raw)
m['images'] = {k: v for k, v in m['images'].items() if not k.startswith('carbon/')}
m['images'].update(images)
m['pages']['carbon'] = {'image': 'carbon/redacted-quote.webp', 'w': page.width, 'h': page.height}
m['markers']['carbon'] = markers
m['lineLabels']['carbon'] = {f: [x['label'] for x in v] for f, v in sorted(markers.items())}
MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print('Created', len(images), 'redacted CarBon images')
