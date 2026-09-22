import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {defaultJob,calculate,validate} from '../dist/engine.mjs';

test('malformed saved-job collections and inherited profile names return validation errors',()=>{
  for(const [key,value] of [['roofPanel','constructor'],['wallPanel','toString'],['rules',[]],['include',[]],['overrides',[]]]){
    const job=defaultJob();job[key]=value;assert.ok(calculate(job).errors.length,key);
  }
  const job=defaultJob();job.openings=[null,{id:'valid',wall:'front',type:'window',width:36,height:36,offset:36,sill:36,cutPanels:true}];
  assert.ok(validate(job).length);
  job.openings=[{...job.openings[1],type:'constructor'}];assert.ok(validate(job).length);
  job.openings=[{...job.openings[0],type:'window',wall:'constructor'}];assert.ok(validate(job).length);
});

test('static server restricts methods and blocks private files, traversal, and escaping symlinks',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'jones-server-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(path.join(dir,'dist'));
  await copyFile(new URL('../server.mjs',import.meta.url),path.join(dir,'server.mjs'));
  await writeFile(path.join(dir,'dist/index.html'),'<h1>Public fixture</h1>');
  await writeFile(path.join(dir,'private.txt'),'PRIVATE FIXTURE');
  await symlink(path.join(dir,'private.txt'),path.join(dir,'dist/link.txt'));
  const child=spawn(process.execPath,[path.join(dir,'server.mjs')],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}});
  const origin=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server did not start')),5000);
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    child.on('exit',()=>{clearTimeout(timer);reject(new Error('Server exited before readiness'));});
  });
  const page=await fetch(origin);assert.equal(page.status,200);assert.match(await page.text(),/Public fixture/);
  assert.equal(page.headers.get('x-content-type-options'),'nosniff');
  assert.match(page.headers.get('content-security-policy'),/object-src 'none'/);
  const health=await fetch(origin+'/healthz');assert.deepEqual(await health.json(),{status:'ok',app:'jones-calculator'});
  const head=await fetch(origin+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(origin+'/',{method:'POST',body:'test'})).status,405);
  for(const name of ['/private.txt','/server.mjs','/.env','/link.txt','/..%2fprivate.txt','/%2e%2e%2fprivate.txt','/%00','/%ZZ']){
    const response=await fetch(origin+name);assert.equal(response.status,404,name);assert.doesNotMatch(await response.text(),/PRIVATE FIXTURE/);
  }
});

test('public audit checks staged bytes and rejects forced private files and synthetic tokens',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'jones-audit-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(path.join(dir,'scripts'));
  await copyFile(new URL('../scripts/public-audit.mjs',import.meta.url),path.join(dir,'scripts/public-audit.mjs'));
  const run=(cmd,args)=>spawnSync(cmd,args,{cwd:dir,encoding:'utf8'});
  const audit=()=>run(process.execPath,['scripts/public-audit.mjs','--staged']);
  assert.equal(run('git',['init','--quiet']).status,0);
  await writeFile(path.join(dir,'README.md'),'Public fixture\n');
  assert.equal(run('git',['add','README.md']).status,0);assert.equal(audit().status,0);
  await writeFile(path.join(dir,'.env'),'PRIVATE_FIXTURE=example\n');
  assert.equal(run('git',['add','-f','.env']).status,0);let result=audit();assert.equal(result.status,1);assert.match(result.stderr,/outside public path policy/);
  assert.equal(run('git',['rm','--cached','.env']).status,0);
  const synthetic=['ghp','_','A'.repeat(36)].join('');
  await writeFile(path.join(dir,'README.md'),synthetic);assert.equal(run('git',['add','README.md']).status,0);
  await writeFile(path.join(dir,'README.md'),'Clean working copy does not clean the index.\n');
  result=audit();assert.equal(result.status,1);assert.match(result.stderr,/GitHub token/);assert.ok(!result.stderr.includes(synthetic));
});
