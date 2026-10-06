import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases } from '../data/cases.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'assets/optimized');
await mkdir(output, { recursive: true });
const manifest = { cases: {}, photos: {} };
async function save(name, pipeline, source) {
  const info = await pipeline.webp({ quality: 92, effort: 6, smartSubsample: true }).toFile(resolve(output, name));
  return { file: `assets/optimized/${name}`, width: info.width, height: info.height, bytes: info.size, sourceBytes: (await stat(source)).size };
}
for (const item of cases) {
  const source = resolve(root, `assets/cases/${item.slug}/${item.mockup}`);
  const image = sharp(source);
  const { width, height } = await image.metadata();
  const crop = { left: 0, top: 0, width, height: Math.min(height, Math.round(width * 4 / 7)) };
  manifest.cases[item.slug] = {
    full: await save(`${item.slug}-full.webp`, image.clone(), source),
    card: await save(`${item.slug}-card.webp`, image.clone().extract(crop).resize({ width: 1200, withoutEnlargement: true }), source),
    small: await save(`${item.slug}-card-small.webp`, image.clone().extract(crop).resize({ width: 640 }), source),
  };
}
for (const [key, file] of [['hero', 'fedor-hero-selected.png'], ['about', 'fedor-about-macbook.jpg']]) {
  const source = resolve(root, 'assets', file);
  manifest.photos[key] = await save(`${key}.webp`, sharp(source), source);
  manifest.photos[`${key}Small`] = await save(`${key}-small.webp`, sharp(source).resize({ width: 640 }), source);
}
await writeFile(resolve(root, 'data/optimized-images.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const [slug, item] of Object.entries(manifest.cases)) console.log(`${slug}: ${(item.full.sourceBytes/1048576).toFixed(2)} MB → ${(item.full.bytes/1048576).toFixed(2)} MB; card ${Math.round(item.card.bytes/1024)} KB`);
console.log(JSON.stringify(manifest.photos));
