import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createContactHandler } from './contact-api.mjs';
import { renderHome } from './scripts/localize.mjs';
import { render404 } from './scripts/not-found.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
try { loadEnvFile(resolve(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const contactHandler = createContactHandler({ token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID, allowedOrigins: (process.env.CONTACT_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean) });
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server = createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (name === '/api/contact') return await contactHandler(req, res);
    if (name === '/en') { res.writeHead(308, { Location: '/en/' }); return res.end(); }
    if (['/', '/index.html', '/en/', '/en/index.html'].includes(name)) {
      const body = await renderHome(name.startsWith('/en/') ? 'en' : 'ru');
      res.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    // Local configuration and repository files are never web assets.
    if (name.split('/').some(segment => segment.startsWith('.'))) { res.writeHead(403); return res.end('Forbidden'); }
    const path = resolve(root,'.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || name.includes('..')) {res.writeHead(403);return res.end('Forbidden');}
    if (!(await stat(path)).isFile()) throw Error('Not a file');
    const body = await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(404,{'Content-Type':mime['.html']});res.end(req.method === 'HEAD' ? undefined : render404());}
});
const port = Number(process.env.PORT || 4173);
server.listen(port,'127.0.0.1',()=>console.log(`PopovWeb ready: http://localhost:${port}`));
