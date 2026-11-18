"""Build ORIX price examples from two private Reddit screenshots.

The 2025 petrol quote prints a nonzero FBT base value but no drive-away total.
The 2026 EV quote prints zero for FBT despite a nonzero vehicle price. Never
publish the unredacted source images; only the redacted excerpts below.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11')
OUT = ROOT / 'docs/assets/images/quote-guide/orix'
MANIFEST = ROOT / 'docs/assets/images/quote-guide/manifest.json'
OUT.mkdir(parents=True, exist_ok=True)
BLUE, RED, ORANGE, WHITE = '#0b5cab', '#c81e1e', '#e65100', 'white'
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)

def marker(draw, x, y, label=None, avoid=False):
    draw.ellipse((x-14, y-14, x+14, y+14), fill=RED if avoid else BLUE, outline=WHITE, width=2)
    if avoid:
        draw.line((x-6, y-6, x+6, y+6), fill=WHITE, width=3)
        draw.line((x-6, y+6, x+6, y-6), fill=WHITE, width=3)
    else:
        box=draw.textbbox((0,0),label,font=FONT)
        draw.text((x-(box[2]-box[0])/2,y-(box[3]-box[1])/2-box[1]),label,font=FONT,fill=WHITE)

# The public screenshot is itself only an excerpt of a quote page. Crop out
# vehicle description and image; keep the genuine pricing table and its labels.
petrol_src = Image.open(PRIVATE / 'images-2025-09/1nnfgrg_1.jpg').convert('RGB')
assert petrol_src.size == (1050, 496), 'Review redaction if source dimensions change'
petrol = petrol_src.crop((0, 0, 490, 348))
d = ImageDraw.Draw(petrol)
d.rectangle((362, 36, 465, 336), fill=WHITE)  # every price and the FBT amount
d.rounded_rectangle((10, 301, 462, 343), radius=5, outline=ORANGE, width=3)
marker(d, 472, 322, '1')  # printed, nonzero FBT base value
# For the calculated drive-away, mark the component rows and cross out the
# GST-exclusive capital cost, which is an attractive but wrong shortcut.
d.rounded_rectangle((10, 37, 462, 275), radius=5, outline=ORANGE, width=3)
marker(d, 472, 54, '2')
d.rounded_rectangle((10, 276, 462, 307), radius=5, outline=ORANGE, width=3)
marker(d, 472, 291, avoid=True)
petrol.save(OUT / 'redacted-price-breakdown.webp', quality=90)
base = petrol.crop((0, 274, 490, 348))
base.save(OUT / 'field-baseValue-nonzero.webp', quality=90)
parts = petrol.crop((0, 0, 490, 315))
parts.save(OUT / 'field-driveaway-parts.webp', quality=90)

ev_src = Image.open(PRIVATE / 'images-aug-nov-2026/1xo5ufn_0.jpg').convert('RGB')
assert ev_src.size == (861, 460), 'Review redaction if source dimensions change'
ev = ev_src.crop((0, 385, 425, 460))
d = ImageDraw.Draw(ev)
d.rectangle((306, 5, 405, 74), fill=WHITE)  # the two quoted amounts
d.rounded_rectangle((9, 38, 405, 72), radius=5, outline=ORANGE, width=3)
marker(d, 410, 55, avoid=True)  # this EV quote printed a zero placeholder
ev.save(OUT / 'field-baseValue-zero.webp', quality=90)

manifest = json.loads(MANIFEST.read_text())
for name, image in [
    ('redacted-price-breakdown.webp', petrol),
    ('field-baseValue-nonzero.webp', base),
    ('field-driveaway-parts.webp', parts),
    ('field-baseValue-zero.webp', ev),
]:
    manifest['images'][f'orix/{name}'] = {'w': image.width, 'h': image.height}
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print('Built four redacted ORIX price examples')
