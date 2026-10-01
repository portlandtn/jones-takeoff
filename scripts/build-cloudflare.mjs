import {execFileSync} from 'node:child_process';
import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {headers} from './cloudflare-headers.mjs';
const target = new URL('../.local/pages-assets/', import.meta.url);
await rm(target, {recursive:true, force:true});
await mkdir(target, {recursive:true});
await cp(new URL('../dist/', import.meta.url), target, {recursive:true});
await writeFile(new URL('_headers', target), '/*\n' + Object.entries(headers).map(([key,value]) => `  ${key}: ${value}`).join('\n') + '\n');
console.log('Prepared Cloudflare static assets with production security headers.');
await writeFile(new URL('404.html', target), 'Not found');
await writeFile(new URL('_routes.json', target), JSON.stringify({version:1, include:['/healthz'], exclude:[]}));
// Public commit identifier makes Git-triggered production deployments verifiable.
const commit = process.env.CF_PAGES_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid deployment commit identifier.');
await writeFile(new URL('deployment.json', target), JSON.stringify({source_commit:commit}) + '\n');
