// Static assets are hosted by Cloudflare; never fall through to a home origin.
export const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-cache',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
};
export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405, headers});
    const url = new URL(request.url);
    if (url.pathname === '/') {
      url.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (url.pathname === '/healthz') {
      return new Response(request.method === 'HEAD' ? null : '{"status":"ok","app":"jones-calculator"}', {
        headers: {...headers, 'Content-Type':'application/json'},
      });
    }
    return new Response(request.method === 'HEAD' ? null : 'Not found', {
      status:404, headers: {...headers, 'Content-Type':'text/plain'},
    });
  },
};
