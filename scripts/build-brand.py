"""Outline the supplied Manrope font and build the approved PopovWeb VW mark.

Requires fontTools. Geometry is shared by the header, downloadable SVG and favicon.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import json
from math import ceil

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design" / "brand-vw"
OUT.mkdir(parents=True, exist_ok=True)
FONT = TTFont(ROOT / "assets" / "font-4.ttf")
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
ACCENT = "#fc6833"
INK = "#191c1d"
WHITE = "#f4f4f0"
SCALE = .1
BASELINE = 148

def number(value):
    return str(round(value, 2)).rstrip('0').rstrip('.') if '.' in str(round(value, 2)) else str(value)

def letters(word, start):
    x = start
    paths = []
    end = x
    for char in word:
        name = CMAP[ord(char)]
        glyph = GLYPHS[name]
        bounds = BoundsPen(GLYPHS)
        glyph.draw(bounds)
        left, bottom, right, top = bounds.bounds
        pen = SVGPathPen(GLYPHS, ntos=number)
        glyph.draw(TransformPen(pen, (SCALE, 0, 0, -SCALE, x, BASELINE)))
        paths.append(pen.getCommands())
        end = x + right * SCALE
        x += FONT['hmtx'][name][0] * SCALE - 6
    return paths, end

# Three equal descending strokes combine the last v of Popov with the W of Web.
# Their pointed lower cuts echo the supplied reference; the upper counter-stroke
# completes the W without adding a separate v glyph.
STROKES = [f'M{x} 0H{x+24}L{x+84} 120L{x+72} 144Z' for x in (0, 59, 118)]
TIP = 'M218 0H245L219.6 44H192.6Z'
left, left_end = letters('Popo', -10)
mark_x = round(left_end + 8, 2)
right, right_end = letters('eb', mark_x + 224)
width = ceil(right_end + 4)
height = 200

def mark(fill, transform=''):
    transform_attr = f' transform="{transform}"' if transform else ''
    return f'<g{transform_attr}><g fill="{fill}">' + ''.join(f'<path d="{d}"/>' for d in STROKES) + f'</g><path fill="{ACCENT}" d="{TIP}"/></g>'

def wordmark(fill):
    return '<g fill="' + fill + '">' + ''.join(f'<path d="{d}"/>' for d in left + right) + '</g>' + mark(fill, f'translate({mark_x} 4)')

def svg(body, box, title='PopovWeb'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img"><title>{title}</title>{body}</svg>\n'

box = f'0 0 {width} {height}'
for name, color in [('popovweb-logo', INK), ('popovweb-logo-light', WHITE)]:
    (ROOT / 'assets' / f'{name}.svg').write_text(svg(wordmark(color), box), encoding='utf-8')
(OUT / 'header-inline.svg').write_text(f'<svg class="brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="{box}" aria-hidden="true" focusable="false">{wordmark("currentColor")}</svg>', encoding='utf-8')

# The favicon has a fixed pale tile so all three strokes stay visible on any
# browser chrome. It uses the exact VW geometry, not the full wordmark.
favicon = '<rect width="256" height="256" rx="48" fill="#f4f4f0"/>' + mark(INK, 'translate(16 62) scale(.914)')
(ROOT / 'assets' / 'favicon.svg').write_text(svg(favicon, '0 0 256 256', 'PopovWeb — VW'), encoding='utf-8')
(ROOT / 'assets' / 'popovweb-mark.svg').write_text(svg(mark(INK, 'translate(0 0)'), '0 0 245 144', 'PopovWeb — VW'), encoding='utf-8')

preview = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650" viewBox="0 0 1200 650">
<rect width="1200" height="325" fill="#f4f4f0"/><rect y="325" width="1200" height="325" fill="#222420"/>
<g transform="translate(72 72) scale({980/width})">{wordmark(INK)}</g>
<g transform="translate(72 397) scale({980/width})">{wordmark(WHITE)}</g>
<g transform="translate(1100 241) scale(.25)">{favicon}</g>
<g transform="translate(1100 566) scale(.25)">{favicon}</g>
</svg>'''
(OUT / 'preview.svg').write_text(preview, encoding='utf-8')
(OUT / 'metrics.json').write_text(json.dumps({'width': width, 'height': height, 'markX': mark_x}), encoding='utf-8')
print(f'Outlined Manrope wordmark: {width} x {height}; three VW strokes + orange accent.')
