import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ absWorkingDir: root, entryPoints: ['ui-v2.jsx'], outfile: 'ui-v2.bundle.js', bundle: true, minify: true, format: 'esm', target: ['es2022'], jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked' });
console.log('Built local Radix UI components.');
