"""Assemble native browser viewport captures using their measured scroll offsets."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
tiles_root = root / 'design/case-restoration/raster-tiles'
records = json.loads((tiles_root / 'manifest.json').read_text(encoding='utf-8'))
metadata_path = root / 'data/case-images.json'
metadata = json.loads(metadata_path.read_text(encoding='utf-8'))

for record in records:
    tiles = record['tiles']
    width, height = tiles[0]['width'], tiles[0]['full']
    canvas = Image.new('RGB', (width, height))
    covered = 0
    for tile in tiles:
        image = Image.open(tiles_root / tile['file']).convert('RGB')
        y = round(tile['y'])
        assert image.size == (width, tile['height']), (tile, image.size)
        assert y <= covered, f'Gap before {tile["file"]}'
        canvas.paste(image, (0, y))
        covered = max(covered, y + image.height)
    assert covered >= height
    filename = f'mockup-{record["device"]}.jpg'
    destination = root / 'assets/cases' / record['slug'] / filename
    canvas.save(destination, quality=96, subsampling=0, optimize=True)
    metadata[record['slug']][filename] = [width, height]
    print(record['slug'], filename, canvas.size, destination.stat().st_size)

metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
