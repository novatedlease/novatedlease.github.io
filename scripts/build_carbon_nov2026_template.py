"""Redact the representative-supplied Nov 2026 CarBon layout.

The unredacted screenshot lives only in the private quote archive. Publish only
these marked WebP outputs. The older CarBon page remains the default template.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11/images-direct/carbon-2026-11-18-new-format.png')
OUT = ROOT / 'docs/assets/images/quote-guide/carbon'
MANIFEST = ROOT / 'docs/assets/images/quote-guide/manifest.json'
PAGE = 'redacted-quote-nov2026.webp'
CROP = 'field-driveaway-nov2026.webp'
PAYMENT_CROP = 'field-payment-nov2026.webp'

image = Image.open(SOURCE).convert('RGB')
assert image.size == (910, 817), 'Source layout changed; review redaction coordinates'
draw = ImageDraw.Draw(image)
dark = image.getpixel((300, 100))
band = image.getpixel((100, 180))
green = image.getpixel((500, 615))
white = (255, 255, 255)

# Organisation, reference number, date and consultant contact.
draw.rectangle((500, 5, 909, 165), fill=dark)
# Model in title and the variable FBT statement in the introduction.
draw.rectangle((280, 172, 650, 215), fill=band)
draw.text((295, 183), 'Novated Lease Quotation', font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 21), fill=dark)
draw.rectangle((45, 269, 390, 287), fill=white)
draw.rectangle((43, 224, 555, 269), fill=white)
body = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 13)
# All printed customer, vehicle and financial values. Preserve the field labels,
# GST wording, and layout so the screenshot remains useful as an actual template.
for rect in [
    (275, 231, 302, 250),    # lease term
    (455, 231, 545, 250),    # salary
    (45, 249, 119, 268),     # annual travel
    (45, 309, 220, 350),     # vehicle model
    (170, 350, 235, 370),    # registration state
    (185, 390, 316, 411),    # residual percentage and value
    (128, 413, 175, 432),    # finance rate
    (185, 433, 236, 452),    # effective rate
    (154, 453, 227, 475),    # drive-away value
    (125, 487, 187, 506),    # payroll cycle
    (390, 534, 447, 779),    # running-cost, payment, GST values
    (817, 534, 875, 578),    # deduction values
]:
    draw.rectangle(rect, fill=white)
draw.text((46, 233), 'Lease term (months):', font=body, fill=dark)
draw.text((46, 251), 'Annual travel (km):', font=body, fill=dark)
draw.rectangle((44, 432, 372, 452), fill=white)
draw.text((47, 435), 'Effective Interest Rate: (incl. all financed fees)', font=body, fill=dark)
# The car photo and RedBook branding identify the example vehicle, not a field.
draw.rectangle((565, 227, 895, 410), fill=white)
# Values in the coloured savings panel.
draw.rounded_rectangle((747, 597, 865, 735), radius=5, fill=green)

# The printed on-road and GST qualification remains immediately beside field 2.
orange = '#ed6d24'
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 17)

def mark(label, rect, center):
    draw.rounded_rectangle(rect, radius=5, outline=orange, width=3)
    cx, cy = center
    draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill='#17549a', outline=white, width=2)
    bounds = draw.textbbox((0, 0), label, font=font)
    draw.text((cx - (bounds[2] - bounds[0]) / 2, cy - (bounds[3] - bounds[1]) / 2 - bounds[1]), label, font=font, fill=white)

def mark_avoid(rect, center):
    # Match the quote-guide convention: orange outline with a red ✕ marker.
    draw.rounded_rectangle(rect, radius=5, outline=orange, width=3)
    cx, cy = center
    draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(200, 30, 30))
    draw.line((cx - 6, cy - 6, cx + 6, cy + 6), fill=white, width=3)
    draw.line((cx - 6, cy + 6, cx + 6, cy - 6), fill=white, width=3)

mark('3', (42, 226, 250, 249), (265, 237))
mark('11', (42, 248, 230, 270), (248, 259))
mark('6', (42, 387, 350, 413), (367, 400))
mark('7', (42, 533, 447, 560), (459, 547))
mark('9', (42, 558, 447, 690), (459, 575))
mark('10', (42, 690, 447, 720), (459, 704))
mark_avoid((42, 730, 447, 759), (459, 744))  # Lease payment includes running costs.
draw.rounded_rectangle((42, 450, 354, 480), radius=5, outline=orange, width=3)
draw.ellipse((360, 450, 388, 478), fill='#17549a', outline=white, width=2)
draw.text((369, 453), '2', font=font, fill=white)

OUT.mkdir(parents=True, exist_ok=True)
image.save(OUT / PAGE, quality=88)
crop = image.crop((14, 375, 460, 490))
crop.save(OUT / CROP, quality=90)
payment_crop = image.crop((27, 510, 480, 784))
payment_crop.save(OUT / PAYMENT_CROP, quality=90)

manifest = json.loads(MANIFEST.read_text())
for name, output in [(PAGE, image), (CROP, crop), (PAYMENT_CROP, payment_crop)]:
    manifest['images'][f'carbon/{name}'] = {'w': output.width, 'h': output.height}
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print('Created redacted Nov 2026 CarBon page, drive-away crop and payment contrast')
