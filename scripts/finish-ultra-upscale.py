"""Finish the tiled 4x restoration, protecting small text from GAN artifacts.

No OCR, rewritten text, generated photographs, or layout reconstruction is used.
The original PNG is immutable. The neural pass is produced by upscale-case.py.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent

source = ROOT / 'assets/cases/ultra-cleaning/original-desktop.png'
neural_path = ROOT / 'design/case-restoration/ultra-original-upscaled.png'
original = Image.open(source).convert('RGB')
neural = Image.open(neural_path).convert('RGB')
assert neural.size == (original.width * 4, original.height * 4)
baseline = original.resize(neural.size, Image.Resampling.LANCZOS)
baseline = baseline.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=3))

# Apply neural detail only inside photographs inspected in the original.
# All lettering, headings, icons and controls keep the original pixel shapes.
photo_mask = Image.new('L', original.size, 0)
draw = ImageDraw.Draw(photo_mask)
photographs = [
    (241, 31, 386, 239),
    (134, 282, 192, 369), (323, 282, 383, 369),
    (134, 382, 192, 466), (323, 382, 383, 466),
    (231, 557, 385, 773),
    (55, 839, 106, 876), (55, 892, 108, 932),
    (55, 945, 107, 981), (56, 999, 109, 1034),
    (270, 839, 379, 906),
    (204, 1438, 285, 1537), (300, 1438, 381, 1537),
    (96, 1711, 167, 1797),
]
for bounds in photographs:
    draw.rectangle(bounds, fill=255)
# Benefit cards overlap the hero photograph and must stay source-exact.
draw.rectangle((0, 182, original.width, 217), fill=0)
photo_mask = photo_mask.resize(neural.size, Image.Resampling.BILINEAR)
photo_mask = photo_mask.filter(ImageFilter.GaussianBlur(3))
strength = np.asarray(photo_mask, dtype=np.float32)[..., None] / 255 * .85
result = np.asarray(neural, dtype=np.float32) * strength
result += np.asarray(baseline, dtype=np.float32) * (1 - strength)
restored = Image.fromarray(np.clip(result, 0, 255).round().astype(np.uint8))
destination = ROOT / 'assets/cases/ultra-cleaning/upscaled-desktop.png'
restored.save(destination, optimize=True)

record = {
    'file': destination.name,
    'source': source.name,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
    'width': restored.width, 'height': restored.height, 'scale': 4,
    'method': 'Tiled Real-ESRGAN 4x, 40px cores with 12px context, photographic detail with source-exact text and interface shapes',
    'limitation': 'Subpixel lettering cannot be recovered reliably; no text has been invented or replaced.'
}
(ROOT / 'data/case-upscales.json').write_text(
    json.dumps({'ultra-cleaning': record}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
sizes_path = ROOT / 'data/case-images.json'
sizes = json.loads(sizes_path.read_text(encoding='utf-8'))
sizes['ultra-cleaning'][destination.name] = list(restored.size)
sizes_path.write_text(json.dumps(sizes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Local visual comparison: left is browser-like enlargement, right restoration.
before = original.resize(restored.size, Image.Resampling.BICUBIC)
comparison = Image.new('RGB', (restored.width * 2, 960), 'white')
comparison.paste(before.crop((0, 0, restored.width, 960)), (0, 0))
comparison.paste(restored.crop((0, 0, restored.width, 960)), (restored.width, 0))
comparison.save(ROOT / 'design/case-restoration/ultra-tiles/before-after.png')
restored.crop((0, 0, restored.width, 960)).save(ROOT / 'design/case-restoration/ultra-tiles/final-hero.png')
print(json.dumps(record, ensure_ascii=False))
