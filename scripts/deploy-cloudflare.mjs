import {readFile, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {configureDeployment} from './cloudflare-config.mjs';
const config = JSON.parse(await readFile(new URL('../wrangler.json', import.meta.url), 'utf8'));
const mode = process.argv.includes('--staging') ? 'staging' : 'production';
if (process.argv.includes('--staging') && process.argv.includes('--production')) throw new Error('Select one deployment mode.');
const deployment = configureDeployment(config, process.env, mode);
const file = new URL('../.local-deploy.json', import.meta.url);
try {
  await writeFile(file, JSON.stringify(deployment));
  const result = spawnSync('npx', ['--no-install', 'wrangler', 'deploy', '--config', file.pathname, ...(process.argv.includes('--dry-run') ? ['--dry-run'] : [])], {stdio:'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {await rm(file, {force:true});}
