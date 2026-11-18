"""Replace three black marker strokes on the already-redacted Clear Lease page.

The input is the published, numbered template, never the unredacted quote. All
pixels outside the header, personal-details values, and page join are retained.
"""

from pathlib import Path
import sys

from PIL import Image, ImageDraw


def clean(source: Path, output: Path) -> None:
    original = Image.open(source).convert("RGB")
    if original.size != (1400, 3564):
        raise ValueError(f"Unexpected Clear Lease template size: {original.size}")
    image = original.copy()
    background = (240, 245, 245)

    # The hand-drawn header and page-join strokes cover only empty decoration.
    # Blend at the left edge; the right edge and whole stroke must be fully blank.
    for left, right, top, bottom in ((500, 560, 0, 174), (690, 740, 1800, 1900)):
        mask = Image.new("L", image.size)
        mask_draw = ImageDraw.Draw(mask)
        for x in range(left, right):
            mask_draw.line((x, top, x, bottom), fill=round(255 * (x - left) / (right - left)))
        mask_draw.rectangle((right, top, image.width, bottom), fill=255)
        image.paste(Image.new("RGB", image.size, background), (0, 0), mask)

    # Personal values were obscured by a black stroke. Leave blank value bars,
    # while restoring the numbered marker and orange row outline on the right.
    draw = ImageDraw.Draw(image)
    draw.rectangle((428, 839, 725, 973), fill=(255, 255, 255))
    for y in (869, 918):
        draw.rounded_rectangle((501, y, 646, y + 13), radius=7, fill=(224, 229, 232))
    draw.line((428, 963, 675, 963), fill=(230, 230, 235), width=2)
    for y in range(839, 974):
        for x in range(718, 726):
            r, g, b = original.getpixel((x, y))
            if r > 150 and g < 150 and b < 110:
                image.putpixel((x, y), (r, g, b))
    badge_mask = Image.new("L", (31, 31))
    ImageDraw.Draw(badge_mask).ellipse((0, 0, 30, 30), fill=255)
    image.paste(original.crop((690, 864, 721, 895)), (690, 864), badge_mask)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "WEBP", quality=92, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: clean_clearlease_template.py INPUT.webp OUTPUT.webp")
    clean(Path(sys.argv[1]), Path(sys.argv[2]))
