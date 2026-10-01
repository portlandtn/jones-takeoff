// Publication guard: heuristic content checks plus an explicit path policy.
// Prints paths and rule names, never matched secret values.
import { readdir, readFile, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const staged = process.argv.includes('--staged');
const roots = new Set(['README.md','CONTRIBUTING.md','SECURITY.md','THIRD_PARTY_NOTICES.md','.gitignore','package.json','package-lock.json','server.mjs']);
const folders = new Set(['functions','dist','docs','scripts','tests','.github']);
const allowedExtensions = new Set(['.md','.mjs','.js','.html','.css','.json','.txt','.yml','.yaml']);
const skipped = new Set(['.git','.wrangler','node_modules','coverage','playwright-report','test-results','.local','private','backups','.vscode','.idea']);
const privateName = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.DS_Store)$|\.(?:pem|key|p12|pfx|crt|log|pid|service|xlsx?|xlsm|csv|tsv|pdf|zip|tar|gz|bak|orig|swp)$/i;
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['cloud access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['service token', /\b(?:xox[baprs]-[A-Za-z0-9-]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,})\b/],
  ['credential-bearing URL', /https?:\/\/[^\s/"'<>]+:[^\s/"'<>]+@/],
  ['assigned credential', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
  ['personal home path', /(?:\/home\/|\/Users\/)[A-Za-z0-9_.-]+\/|[A-Z]:\\Users\\[^\\\s]+\\/],
  ['private network address', /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/],
];
let files = [], excluded = 0;
const findings = [];
const allowed = name => roots.has(name) || (folders.has(name.split('/')[0]) && allowedExtensions.has(path.extname(name)) && !privateName.test(name) && !name.split('/').some(p => skipped.has(p) || p.startsWith('.') && p !== '.github'));
async function walk(dir = '') {
  for (const entry of await readdir(path.join(root, dir), {withFileTypes:true})) {
    const name = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) { findings.push(`${name}: symbolic link requires removal or explicit review`); continue; }
    if (skipped.has(entry.name) || privateName.test(name)) { excluded++; continue; }
    if (entry.isDirectory()) await walk(name);
    else files.push(name);
  }
}
if (staged) {
  try {
    files = execFileSync('git',['ls-files','--cached','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  } catch { console.error('Staged audit requires an initialized Git repository.'); process.exit(1); }
  if (!files.length) { console.error('Nothing in the Git index to audit.'); process.exit(1); }
} else await walk();
for (const name of files.sort()) {
  if (!allowed(name)) findings.push(`${name}: outside public path policy`);
  let bytes;
  if (staged) {
    const mode = execFileSync('git',['ls-files','--stage','--',name],{cwd:root,encoding:'utf8'});
    if (!mode.startsWith('100644 ') && !mode.startsWith('100755 ')) findings.push(`${name}: unsupported Git file mode`);
    bytes = execFileSync('git',['show',`:${name}`],{cwd:root,maxBuffer:16*1024*1024});
  } else {
    if (!(await lstat(path.join(root,name))).isFile()) { findings.push(`${name}: not a regular file`); continue; }
    bytes = await readFile(path.join(root,name));
  }
  if (bytes.includes(0)) findings.push(`${name}: unexpected binary data`);
  const content = bytes.toString('utf8');
  for (const [label,pattern] of rules) if (pattern.test(content)) findings.push(`${name}: ${label}`);
}
console.log(`Checked ${files.length} ${staged ? 'Git index' : 'working-tree public candidate'} files; ${excluded} local paths excluded.`);
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else console.log('No findings under the publication path policy and heuristic rules. Manual review and history scanning are still required.');
