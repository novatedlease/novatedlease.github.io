"""Convert redacted quote pages and build the image manifest.

Run with the private crops/markers.json path. Keep source quote images private.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('markers', type=Path, help='private crops/markers.json')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2] / 'docs/assets/images/quote-guide'
marker_source = args.markers
markers_raw = json.loads(marker_source.read_text())
label_fields = {'1':'baseValue','2':'driveaway','3':'term','4':'defer','5':'docFee','6':'residual','7':'payment','7a':'payment','7b':'payment','8':'luxAdj','9':'running','10':'fees','11':'rate'}

for source in sorted(root.rglob('*.png')):
    image = Image.open(source).convert('RGB')
    width = min(1400, image.width)
    height = round(image.height * width / image.width)
    if image.width != width:
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    target = source.with_suffix('.webp')
    image.save(target, 'WEBP', quality=80, method=6)
    if target.stat().st_size > 400 * 1024:
        raise RuntimeError(f'WebP too large: {target} ({target.stat().st_size} bytes)')

images = {}
for file in sorted(root.rglob('*.webp')):
    with Image.open(file) as im:
        images[str(file.relative_to(root))] = {'w': im.width, 'h': im.height}

pages = {}
field_markers = {}
for provider, source in sorted(markers_raw.items()):
    page = f'{provider}/redacted-quote.webp'
    if page not in images:
        continue
    original_w, original_h = source['size']
    out_w, out_h = images[page]['w'], images[page]['h']
    pages[provider] = {'image': page, 'w': out_w, 'h': out_h}
    fields = {}
    for item in source['markers']:
        field = label_fields.get(str(item['label']).lower())
        if field is None:
            continue
        box = item['box']
        fields.setdefault(field, []).append({
            'label': str(item['label']),
            'y': round(item['cy'] * out_h / original_h),
            'h': round((box[3] - box[1]) * out_h / original_h),
        })
    field_markers[provider] = fields

manifest = {'images': images, 'pages': pages, 'markers': field_markers}
(root / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print('images',len(images),'pages',len(pages),'markers',sum(len(v) for d in field_markers.values() for v in d.values()))
