"""Join overlapping screenshots of the original, fully loaded Royal Trees DOM.

The capture copy only stops motion and reveals the final states of scroll
animations. It does not replace content, photographs, typography, or layout.
Overlaps omit repeated sticky navigation and floating chat controls.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
capture = root / 'design/case-restoration/original-captures'
tiles = json.loads((capture / 'royal-original-tiles.json').read_text())
width, height = 1264, tiles[0]['full']
canvas = Image.new('RGB', (width, height), 'white')
covered = 0
for index, tile in enumerate(tiles):
    image = Image.open(capture / tile['file']).convert('RGB')
    # Browser screenshot pixels and CSS pixels differ slightly on this host.
    image = image.resize((tile['width'], tile['height']), Image.Resampling.LANCZOS)
    top = 0 if index == 0 else 90
    bottom = tile['height'] if index == len(tiles) - 1 else 560
    y = round(tile['y']) + top
    assert y <= covered, f'Missing screenshot coverage before {tile["file"]}'
    assert tile['full'] == height, 'Page geometry changed during capture'
    canvas.paste(image.crop((0, top, width, bottom)), (0, y))
    covered = max(covered, round(tile['y']) + bottom)
assert covered >= height
destination = root / 'assets/cases/royal-trees/original-desktop.png'
canvas.save(destination, optimize=True)
canvas.resize((434, 4000), Image.Resampling.LANCZOS).save(capture / 'royal-original-overview.png')
print(f'Original Royal Trees capture: {width} x {height}, {destination.stat().st_size} bytes')
