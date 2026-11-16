"""Lendly FBT base value picture: the two lines to use, stacked (16 Nov 2026).

Top: the published, already-redacted "GST Tax Credit" crop. Bottom: "Taxable Value" from page 7
of the private source quote (Reddit 1wus9yl), with every figure replaced by a grey bar.
Only the WebP output is publishable.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'docs/assets/images/quote-guide/lendly'
SRC = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11/images-aug-nov-2026/1wus9yl_0.jpg')
W = 1400
ORANGE = (234, 106, 41)
BAR = (224, 224, 224)
BOLD = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 30)


def label_band(text):
    band = Image.new('RGB', (W, 56), (242, 246, 251))
    ImageDraw.Draw(band).text((40, 12), text, font=BOLD, fill=(21, 84, 154))
    return band


top = Image.open(DIR / 'field-gst-credit.webp').convert('RGB')

page = Image.open(SRC).convert('RGB')
d = ImageDraw.Draw(page)
for y0, y1 in [(143, 178), (178, 212), (213, 246), (247, 281), (282, 315)]:
    d.rectangle((700, y0, 870, y1), fill='white')  # every figure in the table
d.rectangle((560, 120, 900, 330), fill='white')
bottom = page.crop((110, 70, 900, 212))
bottom = bottom.resize((round(bottom.width * 1.75), round(bottom.height * 1.75)), Image.LANCZOS)
canvas = Image.new('RGB', (W, bottom.height), 'white')
canvas.paste(bottom, (0, 0))
cd = ImageDraw.Draw(canvas)
for y in (160, 220):  # grey bars where the two figures were (Pre-tax Salary Sacrifice, Taxable Value)
    cd.rounded_rectangle((1060, y - 14, 1360, y + 14), radius=14, fill=BAR)
cd.rounded_rectangle((25, 186, 1380, 246), radius=8, outline=ORANGE, width=4)
bottom = canvas

parts = [label_band('Credit less than the maximum: multiply by 11'), top,
         label_band('Credit at the maximum: multiply Taxable Value by 5'), bottom]
out = Image.new('RGB', (W, sum(p.height for p in parts)), 'white')
y = 0
for p in parts:
    out.paste(p, (0, y))
    y += p.height
out.save(DIR / 'field-base-value-methods.webp', quality=88)
print(out.size)
