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
  '_headers', 'robots.txt',
  'assets/favicon.svg', 'assets/stitch-velora.webp',
  'assets/stitch-stilla.webp', 'assets/stitch-luma.webp',
  'assets/Manrope-OFL.txt', 'assets/Barlow-Condensed-OFL.txt',
  ...Array.from({ length: 7 }, (_, i) => `assets/font-${i}.ttf`),
  ...(await readdir(resolve(root, 'assets/stack'))).filter(name => /\.(svg|txt)$/.test(name)).map(name => `assets/stack/${name}`),
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
