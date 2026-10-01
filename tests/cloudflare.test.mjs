import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/healthz.js';
import {headers} from '../scripts/cloudflare-headers.mjs';
test('Pages health endpoint preserves GET and HEAD contract',async()=>{
  for(const method of ['GET','HEAD']) {
    const response=onRequest({request:new Request('https://example.com/healthz',{method})});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Content-Type'),'application/json');
    assert.equal(response.headers.get('Content-Security-Policy'),headers['Content-Security-Policy']);
    assert.equal(await response.text(),method==='HEAD'?'':'{"status":"ok","app":"jones-calculator"}');
  }
});
test('Pages health endpoint refuses unsupported methods',()=>{
  for(const method of ['POST','PUT','DELETE','OPTIONS']) {
    assert.equal(onRequest({request:new Request('https://example.com/healthz',{method})}).status,405);
  }
});
