import { cp, mkdir, readdir, rm, stat, writeFile, readFile } from 'node:fs/promises';
import { buildPages, deployment, sitemap, robots } from './localize.mjs';
import { render404 } from './not-found.mjs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
if (dirname(output) !== resolve(root) || output === resolve(root)) throw new Error('Invalid output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Explicit production manifest: local experiments and archives never enter a deployment.
const files = [
  'fonts.css', 'styles.css', 'studio.css',
  'app.js', 'translations.js', 'studio.js', 'studio-copy.js', 'rotor.js',
  'container-v2.css', 'header-v2.js', 'hero-grid-v2.js',
  'contact-v2.js', 'contact-copy.js', 'contact-validation.js', 'ui-v2.bundle.js', 'ui-v2.bundle.js.LEGAL.txt',
  'locale-transition.js', 'locale-transition.css',
  'main-page.css', 'main-page.js', 'portfolio.js', 'process-story.css', 'process-story.js', 'cases.css', 'case-dialog.js',
  'v2.html', 'v2.css', 'v2.js',
  'v3.html', 'v3.css', 'v3.js', 'v3-base.css', 'v3-base.js',
  '_headers',
  'assets/social-ru.png', 'assets/social-en.png',
  'assets/favicon.svg', 'assets/favicon-32.png', 'assets/stitch-velora.webp',
  'assets/popovweb-logo.svg', 'assets/popovweb-logo-light.svg', 'assets/popovweb-mark.svg',
  'assets/stitch-stilla.webp', 'assets/stitch-luma.webp',
  'assets/fedor-hero-selected.png', 'assets/fedor-hero-grid.png',
  'assets/fedor-hero-selected-v3.webp', 'assets/fedor-hero-grid-v3.webp',
  'assets/fedor-about-macbook.jpg', 'assets/fedor-call-avatar.png', 'assets/velora-desktop.jpg', 'assets/velora-phone.jpg',
  'assets/Manrope-OFL.txt', 'assets/Barlow-Condensed-OFL.txt',
  ...Array.from({ length: 7 }, (_, i) => `assets/font-${i}.ttf`),
  ...(await readdir(resolve(root, 'assets/stack'))).filter(name => /\.(svg|png|txt)$/.test(name)).map(name => `assets/stack/${name}`),
  ...(await readdir(resolve(root, 'assets/icons'))).filter(name => /\.(svg|txt)$/.test(name)).map(name => `assets/icons/${name}`),
  // Optimized delivery copies retain the originals' dimensions; PNG sources stay in Git.
  ...(await readdir(resolve(root, 'assets/optimized'))).filter(name => name.endsWith('.webp')).map(name => `assets/optimized/${name}`),
];
let bytes = 0;
for (const file of files) {
  const source = resolve(root, file);
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  bytes += (await stat(source)).size;
}
const config = deployment();
await buildPages(output, config);
await writeFile(resolve(output, 'robots.txt'), robots(config));
await writeFile(resolve(output, '404.html'), render404(config));
const xml = sitemap(config);
if (xml) await writeFile(resolve(output, 'sitemap.xml'), xml);
// Experimental versions must stay out of search even after the main site is launched.
for (const name of ['v2.html', 'v3.html']) {
  const file = resolve(output, name);
  const source = await readFile(file, 'utf8');
  const html = source.replace(/<meta\s+name="robots"[^>]*>/g, '').replace('</head>', '<meta name="robots" content="noindex, follow">\n</head>');
  await writeFile(file, html);
}
console.log(`Built ${files.length} files (${(bytes / 1024 / 1024).toFixed(2)} MB) in dist/`);
