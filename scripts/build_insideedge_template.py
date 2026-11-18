"""Rebuild Inside Edge quote guide artwork from the private Reddit archive.

Only redacted, numbered WebP files in docs/assets are publishable. Source JPGs stay private.
"""
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont
import pytesseract
from pytesseract import Output

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/Users/changyang1230/novated-lease-guide/private/quote-review-2026-11/images-2025-11')
OUT = ROOT / 'docs/assets/images/quote-guide/insideedge'
OUT.mkdir(parents=True, exist_ok=True)
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 20)


def redact(source, basics):
    im = Image.open(SRC / source).convert('RGB')
    d = ImageDraw.Draw(im)
    # Remove whole customer/vehicle detail blocks, including existing black marker strokes.
    if basics:
        d.rectangle((690, 196, 1163, 506), fill='white')
        d.text((707, 214), 'Quote details removed', font=FONT, fill='#15549a')
        d.rectangle((275, 245, 652, 330), fill='white')
        d.rectangle((1015, 605, 1152, 938), fill='white')
    else:
        d.rectangle((55, 236, 393, 390), fill='white')  # identifying car description
    data = pytesseract.image_to_data(im, output_type=Output.DICT, config='--psm 11')
    for i, word in enumerate(data['text']):
        word = word.strip()
        if not word or not (re.search(r'\d|[$@]', word) or word in {'New', 'VIC'}):
            continue
        x, y, w, h = (data[k][i] for k in ('left', 'top', 'width', 'height'))
        if y < 170:  # preserve the Inside Edge branding
            continue
        # Preserve the printed 1/2/3 process-step circles in the Basics explainer.
        if basics and x < 120 and 565 < y < 1150:
            continue
        d.rectangle((x-4, y-3, x+w+5, y+h+4), fill='white')
    if not basics:
        # The car description reaches into adjacent labels. Redraw those labels cleanly.
        d.rectangle((395, 226, 720, 400), fill='white')
        body_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
        for y, label in [(241, 'New / Used:'), (275, 'Colour:'), (309, 'Start Kilometres:'),
                         (343, 'Annual Kilometres:'), (377, 'End Kilometres:')]:
            d.text((405, y), label, font=body_font, fill='#444444')
    return im


def mark(im, label, x, y, rect):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(rect, radius=7, outline='#ea6a29', width=4)
    r=20
    d.ellipse((x-r,y-r,x+r,y+r),fill='#15549a',outline='white',width=3)
    box=d.textbbox((0,0),label,font=FONT)
    d.text((x-(box[2]-box[0])/2,y-(box[3]-box[1])/2-box[1]),label,font=FONT,fill='white')

basics=redact('1p2wqvv_1.jpg',True)
details=redact('1p2wqvv_0.jpg',False)
# Mark the exact line or group to transcribe. Labels match the calculator field numbers.
marks={
 'driveaway': ('basics','2',334,390,(359,383,653,414)),
 'term': ('basics','3',334,422,(359,413,653,444)),
 'payment': ('basics','7',666,615,(690,607,1150,637)),
 'running': ('basics','9',666,665,(690,638,1150,755)),
 'fees': ('basics','10',665,807,(690,720,1150,826)),
 'residual': ('details','6',770,342,(791,337,1157,369)),
 'baseValue': ('details','1',770,438,(791,433,1157,466)),
 'mileage': ('details','11',370,347,(398,339,690,374)),
}
for _,(page,label,x,y,rect) in marks.items():
    mark(basics if page=='basics' else details,label,x,y,rect)
basics.save(OUT/'redacted-quote-page-1.webp',quality=85)
details.save(OUT/'redacted-quote.webp',quality=85)
# Focused image opens by default, with a link to both full redacted pages.
crops={
 'driveaway': (basics,(315,352,1170,450)),
 'term': (basics,(315,397,1170,460)),
 'payment': (basics,(645,570,1170,653)),
 'running': (basics,(645,565,1170,837)),
 'fees': (basics,(645,701,1170,850)),
 'docFee': (basics,(645,701,1170,850)),
 'residual': (details,(745,295,1170,385)),
 'baseValue': (details,(745,388,1170,485)),
 'mileage': (details,(345,322,710,395)),
}
for field,(im,box) in crops.items():
    im.crop(box).save(OUT/f'field-{field}.webp',quality=86)
print('Created', len(crops)+2, 'redacted Inside Edge images')
