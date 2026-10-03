import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
if (dirname(output) !== resolve(root) || output === resolve(root)) throw new Error('Invalid output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Explicit production manifest: local experiments and archives never enter a deployment.
const files = [
  'index.html', 'fonts.css', 'styles.css', 'studio.css',
  'app.js', 'translations.js', 'studio.js', 'studio-copy.js', 'rotor.js',
  'container-v2.css', 'header-v2.js', 'hero-grid-v2.js',
  'contact-v2.js', 'contact-validation.js', 'ui-v2.bundle.js', 'ui-v2.bundle.js.LEGAL.txt',
  'main-page.css', 'main-page.js', 'portfolio.js',
  'v2.html', 'v2.css', 'v2.js',
  'v3.html', 'v3.css', 'v3.js', 'v3-base.css', 'v3-base.js',
  '_headers', 'robots.txt',
  'assets/favicon.svg', 'assets/stitch-velora.webp',
  'assets/stitch-stilla.webp', 'assets/stitch-luma.webp',
  'assets/fedor-hero-selected.png', 'assets/fedor-hero-grid.png',
  'assets/fedor-hero-selected-v3.webp', 'assets/fedor-hero-grid-v3.webp',
  'assets/fedor-about-macbook.jpg', 'assets/velora-desktop.jpg', 'assets/velora-phone.jpg',
  'assets/Manrope-OFL.txt', 'assets/Barlow-Condensed-OFL.txt',
  ...Array.from({ length: 7 }, (_, i) => `assets/font-${i}.ttf`),
  ...(await readdir(resolve(root, 'assets/stack'))).filter(name => /\.(svg|png|txt)$/.test(name)).map(name => `assets/stack/${name}`),
  ...(await readdir(resolve(root, 'assets/icons'))).filter(name => /\.(svg|txt)$/.test(name)).map(name => `assets/icons/${name}`),
];
let bytes = 0;
for (const file of files) {
  const source = resolve(root, file);
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  bytes += (await stat(source)).size;
}
console.log(`Built ${files.length} files (${(bytes / 1024 / 1024).toFixed(2)} MB) in dist/`);
