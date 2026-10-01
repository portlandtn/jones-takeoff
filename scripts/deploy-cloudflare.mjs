import {readFile, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const config = JSON.parse(await readFile(new URL('../wrangler.json', import.meta.url), 'utf8'));
const route = process.env.CLOUDFLARE_ROUTE;
const zone = process.env.CLOUDFLARE_ZONE_ID;
if (Boolean(route) !== Boolean(zone)) throw new Error('Set both CLOUDFLARE_ROUTE and CLOUDFLARE_ZONE_ID.');
if (process.env.GITHUB_ACTIONS && !route) throw new Error('Configure the verified production route before enabling automatic publishing.');
if (route) {
  if (!/^[a-z0-9.-]+\/\*$/i.test(route) || !/^[a-f0-9]{32}$/i.test(zone)) throw new Error('Expected one exact hostname/* route and a zone ID.');
  config.routes = [{pattern:route, zone_id:zone}];
}
const file = new URL('../.local-deploy.json', import.meta.url);
try {
  await writeFile(file, JSON.stringify(config));
  const result = spawnSync('npx', ['--no-install', 'wrangler', 'deploy', '--config', file.pathname], {stdio:'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {await rm(file, {force:true});}
