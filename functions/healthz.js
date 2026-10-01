import {headers} from '../scripts/cloudflare-headers.mjs';
export function onRequest({request}) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405, headers});
  return new Response(request.method === 'HEAD' ? null : '{"status":"ok","app":"jones-calculator"}', {
    headers: {...headers, 'Content-Type':'application/json'},
  });
}
