"""Mark the first-year premium on existing public, redacted provider quote pages."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "docs/assets/images/quote-guide"
# Source-page coordinates at the published 1400 px width. No private quote is read.
REGIONS = {
    "oly": ((50, 2860, 1350, 3090), (58, 43, 1255, 216)),
    "maxxia": ((50, 1048, 1350, 1240), (74, 27, 1250, 178)),
}

for provider, (crop, outline) in REGIONS.items():
    page = Image.open(ROOT / provider / "redacted-quote.webp").convert("RGB")
    image = page.crop(crop)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(outline, radius=8, outline="#ca5500", width=4)
    draw.ellipse((10, 36, 44, 70), fill="#16824a")
    draw.line(((18, 53), (25, 60), (37, 45)), fill="white", width=4, joint="curve")
    image.save(ROOT / provider / "field-financedInsurance.webp", "WEBP", quality=90)
