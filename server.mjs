import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json'};
const server = createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path = resolve(root,'.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || name.includes('..')) {res.writeHead(403);return res.end('Forbidden');}
    if (!(await stat(path)).isFile()) throw Error('Not a file');
    const body = await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('PopovWeb ready: http://localhost:4173'));
