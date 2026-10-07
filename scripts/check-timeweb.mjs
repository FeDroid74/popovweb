import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { parse } from 'parse5';

const root = resolve('dist');
const entries = await readdir(root, { recursive: true, withFileTypes: true });
const files = entries.filter(e => e.isFile()).map(e => resolve(e.parentPath, e.name));
let references = 0;
async function check(value, file) {
  if (!value || /^(?:[a-z]+:|\/\/|#)/i.test(value)) return;
  const path = value.split(/[?#]/)[0];
  if (!path) return;
  const target = path.startsWith('/') ? resolve(root, '.' + path) : resolve(dirname(file), path);
  const rel = relative(root, target);
  assert(!rel.startsWith('..'), `Reference outside dist: ${value}`);
  const info = await stat(target).catch(() => { throw new Error(`${relative(root, file)} references missing ${value}`); });
  if (info.isDirectory()) await stat(resolve(target, 'index.html'));
  references++;
}
for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  assert(!/(^|\/)(?:node_modules|\.git|\.env[^/]*|package(?:-lock)?\.json|v[23]\.html|_headers|\.htaccess)$/.test(name), `Unexpected deployment file: ${name}`);
  assert(!/\.(?:mjs|map|zip|log)$/.test(name), `Unexpected deployment file: ${name}`);
  if (!/\.(html|css|js)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  if (file.endsWith('.html')) {
    const nodes = [parse(source)];
    while (nodes.length) {
      const n = nodes.pop();
      nodes.push(...n.childNodes || []);
      for (const a of n.attrs || []) {
        if (['src', 'href', 'data-case-src'].includes(a.name)) await check(a.value, file);
        if (a.name === 'srcset') for (const item of a.value.split(',')) await check(item.trim().split(/\s+/)[0], file);
      }
    }
    assert.match(source, /<meta name="robots" content="noindex,/);
  }
  if (file.endsWith('.css')) for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) await check(match[1], file);
  if (file.endsWith('.js')) for (const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) await check(match[1], file);
}
for (const name of ['index.html', 'en/index.html']) {
  const source = await readFile(resolve(root, name), 'utf8');
  assert(!source.includes('data-contact-disabled="true"'));
  assert.match(source, /action="\/api\/contact\.php"/);
  assert(source.includes('https://popovweb.com/'));
  assert(!source.includes('fedroid74.github.io'));
}
assert.equal(await readFile(resolve(root, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
assert(!files.some(p => p.endsWith('sitemap.xml')));
if (process.env.GITHUB_SHA) {
  assert.equal(JSON.parse(await readFile(resolve(root, 'deployment.json'), 'utf8')).commit, process.env.GITHUB_SHA);
}
assert(files.includes(resolve(root, 'api/contact.php')));
assert(!files.some(p => /telegram\.(?:json|php)|rate-limit\.(?:json|php)|[\\/]_private[\\/]/.test(p)));
console.log(`Timeweb export: ${files.length} files, ${references} local references checked; noindex, PHP form enabled.`);
