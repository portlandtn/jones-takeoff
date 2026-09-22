import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const headers = { 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-cache', 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'" };
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, headers); return res.end(); }
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') { res.writeHead(200, {...headers,'Content-Type':'application/json'}); return res.end(req.method === 'HEAD' ? '' : '{"status":"ok","app":"jones-calculator"}'); }
    const pathname = decodeURIComponent(url.pathname);
    const filename = await realpath(path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
    const relative = path.relative(await realpath(root), filename);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || pathname.includes('\0')) throw new Error('Invalid path');
    if (!(await stat(filename)).isFile()) throw new Error('Not a file');
    const data = await readFile(filename);
    res.writeHead(200, {...headers,'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Content-Length':data.length});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404, {...headers,'Content-Type':'text/plain'}); res.end('Not found'); }
});
server.on('error', e => { console.error(e.message); process.exit(1); });
server.listen(port, host, () => console.log(`Jones calculator: http://${host}:${server.address().port}`));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
