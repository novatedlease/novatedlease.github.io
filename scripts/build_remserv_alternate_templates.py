"""Make redacted RemServ examples from two additional reviewed Reddit layouts.

Reads the local private quote archive. Only the masked output is written to the
public quote-guide assets; source amounts never enter this repository.
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path.home() / "novated-lease-guide/private/quote-review-2026-11"
OUT = ROOT / "docs/assets/images/quote-guide/remserv"


def source(name: str) -> Image.Image:
    matches = list(PRIVATE.glob(f"images*/{name}.jpg"))
    if len(matches) != 1:
        raise FileNotFoundError(f"Expected one private source for {name}, found {len(matches)}")
    return Image.open(matches[0]).convert("RGB")


def blank(image: Image.Image, boxes: list[tuple[int, int, int, int]]) -> Image.Image:
    draw = ImageDraw.Draw(image)
    for box in boxes:
        draw.rectangle(box, fill="white")
    return image


def save(image: Image.Image, name: str) -> None:
    image.save(OUT / name, "WEBP", quality=91)


FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)


def marker(draw: ImageDraw.ImageDraw, x: int, y: int, number: str) -> None:
    draw.ellipse((x, y, x + 32, y + 32), fill="#16824a")
    draw.text((x + 16, y + 16), number, font=FONT, fill="white", anchor="mm")


def focused(image: Image.Image, box: tuple[int, int, int, int],
            line: tuple[int, int, int, int], name: str, number: str) -> None:
    crop = image.crop(box)
    draw = ImageDraw.Draw(crop)
    draw.rounded_rectangle(line, radius=7, outline="#ca5500", width=4)
    marker(draw, 8, line[1] + 6, number)
    save(crop, name)


def marked_page(image: Image.Image, rows: list[tuple[str, tuple[int, int, int, int],
                                                tuple[int, int, int, int]]], name: str) -> None:
    page = image.copy()
    draw = ImageDraw.Draw(page)
    for number, crop, line in rows:
        x0, y0, _, _ = crop
        left, top, right, bottom = line
        draw.rounded_rectangle((x0 + left, y0 + top, x0 + right, y0 + bottom),
                               radius=7, outline="#ca5500", width=4)
        marker(draw, x0 + 8, y0 + top + 6, number)
    save(page, name)


# The March summary is a table. Remove its entire answer column, including the
# vehicle, salary and payment amounts, while keeping the printed row labels.
summary = blank(source("1rpt6ql_0"), [(590, 187, 752, 1610)])
save(summary, "redacted-summary-table.webp")

# The May detail pages place all answers in the right column. The separate
# procurement amount and optional-product selection ticks are also removed.
lease = blank(source("1t4254u_0"), [
    (885, 124, 1190, 440),
    (960, 520, 1150, 580), (960, 690, 1150, 755),
    (995, 770, 1150, 875), (980, 990, 1150, 1060),
    (1000, 1150, 1150, 1220), (980, 1345, 1150, 1420),
    (960, 1575, 1150, 1633), (432, 570, 470, 615),
    (110, 990, 150, 1055), (110, 1150, 150, 1220), (110, 1345, 150, 1415),
])

deductions = blank(source("1t4254u_1"), [
    (795, 225, 1125, 1150), (630, 1045, 755, 1160),
])

# The November split summary has its purchase rows on the preceding screenshot.
# Keep that page redacted; the bold Total Vehicle Costs row is on the next one.
compact = blank(source("1x6eio8_2"), [(758, 395, 970, 2039)])
save(compact, "redacted-compact-summary.webp")

# A newer summary layout prints a net-of-residual “Total Amount Financed”.
# Its Reddit screenshots split one table across several images; this section
# retains the original row labels and printed formula without any amounts.
net_finance = blank(source("1x6eio8_0"), [
    (758, 0, 970, 770), (115, 450, 753, 568),
]).crop((100, 0, 980, 770))
net_draw = ImageDraw.Draw(net_finance)
net_draw.rounded_rectangle((14, 2, 867, 70), radius=7, outline="#ca5500", width=4)
marker(net_draw, 825, 8, "2")
net_draw.rounded_rectangle((14, 572, 867, 752), radius=7, outline="#ca5500", width=4)
marker(net_draw, 825, 587, "3")
save(net_finance, "redacted-net-finance.webp")
save(net_finance.crop((0, 0, 880, 90)), "field-alt-compact-total.webp")

# Each crop stays tied to its source page for the in-card Whole page toggle.
summary_rows = [
    ("1", (45, 380, 750, 480), (15, 60, 685, 86), "field-alt-summary-baseValue.webp"),
    ("2", (45, 690, 750, 820), (15, 57, 685, 82), "field-alt-summary-total.webp"),
    ("5", (45, 620, 750, 765), (15, 47, 685, 79), "field-alt-summary-insurance.webp"),
]
lease_rows = [
    ("1", (78, 386, 1180, 457), (12, 5, 1088, 66), "field-alt-baseValue.webp"),
    ("2", (78, 495, 1180, 680), (12, 8, 1088, 175), "field-alt-driveaway.webp"),
    ("3", (78, 257, 1180, 345), (12, 5, 1088, 81), "field-alt-residual.webp"),
    ("4", (78, 782, 1180, 828), (12, 3, 1088, 44), "field-alt-docFee.webp"),
    ("5", (78, 822, 1180, 993), (12, 5, 1088, 163), "field-alt-financedInsurance.webp"),
]
deduction_rows = [
    ("6", (44, 165, 1130, 360), (15, 10, 1072, 188), "field-alt-payment.webp"),
    ("7", (44, 355, 1130, 1000), (15, 15, 1072, 520), "field-alt-running.webp"),
    ("8", (44, 915, 1130, 1025), (15, 46, 1072, 105), "field-alt-fees.webp"),
]
for image, rows in ((summary, summary_rows), (lease, lease_rows), (deductions, deduction_rows)):
    for number, crop, line, name in rows:
        focused(image, crop, line, name, number)
    name = {id(summary): "redacted-summary-table.webp",
            id(lease): "redacted-lease-breakdown.webp",
            id(deductions): "redacted-deductions.webp"}[id(image)]
    marked_page(image, [(number, crop, line) for number, crop, line, _ in rows], name)

manifest_path = OUT.parent / "manifest.json"
manifest = json.loads(manifest_path.read_text())
for obsolete in ("field-alt-summary-price.webp", "field-alt-compact-driveaway.webp"):
    (OUT / obsolete).unlink(missing_ok=True)
    manifest["images"].pop(f"remserv/{obsolete}", None)
for name in ("redacted-net-finance.webp", "redacted-compact-summary.webp",
             "field-alt-compact-total.webp", "field-alt-summary-baseValue.webp",
             "field-alt-summary-total.webp"):
    with Image.open(OUT / name) as image:
        manifest["images"][f"remserv/{name}"] = {
            "w": image.width, "h": image.height,
        }
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
