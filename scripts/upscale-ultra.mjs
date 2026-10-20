// Deterministic enlargement of the owner's screenshot; no generated text or details.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = new URL('assets/cases/ultra-cleaning/original-desktop.png', root);
const destination = new URL('assets/cases/ultra-cleaning/upscaled-desktop.png', root);
const original = await readFile(source);
const originals = JSON.parse(await readFile(new URL('data/case-originals.json', root), 'utf8'));
const sha256 = data => createHash('sha256').update(data).digest('hex');
if (sha256(original) !== originals['ultra-cleaning'].sha256) throw new Error('Unrecorded original screenshot');
const { width, height } = await sharp(original).metadata();
const scale = 2;
const enlarged = await sharp(original)
  .resize(width * scale, height * scale, { kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9 }).toBuffer();
await writeFile(destination, enlarged);
const manifestUrl = new URL('data/case-upscales.json', root);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
manifest['ultra-cleaning'] = {
  file: 'upscaled-desktop.png', source: 'original-desktop.png',
  sourceSha256: sha256(original), sha256: sha256(enlarged),
  width: width * scale, height: height * scale, scale,
  method: 'Deterministic Lanczos3 2x resampling of the owner-supplied cleankrd.png; no generative processing, OCR, compositing or content replacement.',
  limitation: 'Enlargement preserves the supplied content; it does not recover details absent from the original.'
};
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Ultra Cleaning 23: ${width}x${height} -> ${width * scale}x${height * scale}`);
