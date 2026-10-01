import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {headers} from './cloudflare-worker.mjs';
const target = new URL('../.local/cloudflare-assets/', import.meta.url);
await rm(target, {recursive:true, force:true});
await mkdir(target, {recursive:true});
await cp(new URL('../dist/', import.meta.url), target, {recursive:true});
await writeFile(new URL('_headers', target), '/*\n' + Object.entries(headers).map(([key,value]) => `  ${key}: ${value}`).join('\n') + '\n');
console.log('Prepared Cloudflare static assets with production security headers.');
