import test from 'node:test';
import assert from 'node:assert/strict';
import {configureDeployment} from '../scripts/cloudflare-config.mjs';
const base={name:'jones-takeoff',assets:{binding:'ASSETS'}};
const env={CLOUDFLARE_ROUTE:'takeoff.example.com/*',CLOUDFLARE_ZONE_ID:'a'.repeat(32)};
test('production deploys retain exactly the supplied hostname route',()=>{
  const result=configureDeployment(base,env,'production');
  assert.deepEqual(result.routes,[{pattern:env.CLOUDFLARE_ROUTE,zone_id:env.CLOUDFLARE_ZONE_ID}]);
  assert.equal(base.routes,undefined);
});
test('production fails closed with missing, partial, or broad routes',()=>{
  for(const input of [{},{CLOUDFLARE_ROUTE:env.CLOUDFLARE_ROUTE},{...env,CLOUDFLARE_ROUTE:'*.example.com/*'},{...env,CLOUDFLARE_ROUTE:'example.com/app/*'},{...env,CLOUDFLARE_ZONE_ID:'bad'}]) {
    assert.throws(()=>configureDeployment(base,input,'production'));
  }
});
test('staging cannot accidentally apply a production route',()=>{
  assert.deepEqual(configureDeployment(base,{},'staging').routes,[]);
  assert.throws(()=>configureDeployment(base,env,'staging'));
  assert.throws(()=>configureDeployment({...base,routes:[env.CLOUDFLARE_ROUTE]}, {},'staging'));
});
