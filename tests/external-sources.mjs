import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { localDatabase } from '../scripts/sqlite-preview.mjs';
import { createWorker } from '../worker/gate.mjs';

test('external API and SQL profiles are independent and only an administrator can save or read', async t => {
  const sql = new DatabaseSync(':memory:');
  sql.exec("CREATE TABLE meters (site TEXT, kwh INTEGER); INSERT INTO meters VALUES ('school', 0)");
  const db = localDatabase();
  t.after(() => { sql.close(); db.sqlite.close(); });
  const origin = 'https://atlas.example';
  const env = { DB: db, ATLAS_SESSION_KEY:randomBytes(32).toString('hex'),
    ATLAS_ACCESS_HASH:createHash('sha256').update('TESTTESTTESTTEST').digest('hex'), ATLAS_INITIAL_GUEST_CODE:'1904' };
  const calls = [];
  const api = 'https://municipality.example/meters';
  let apiRows = [{ site:'school', kwh:0 }];
  const fetcher = async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    if (url === api + '?format=json') {
      assert.equal(options.method,'GET');
      assert.equal(options.headers.Authorization, 'Bearer ' + env.ATLAS_EXTERNAL_API_TOKEN);
      return Response.json({ data:{ items:apiRows } });
    }
    const body = JSON.parse(options.body);
    if (url === 'https://example.turso.io/v2/pipeline') {
      assert.equal(options.headers.Authorization, 'Bearer ' + env.ATLAS_EXTERNAL_LIBSQL_TOKEN);
      assert.equal(body.requests[1].type,'close');
      const query = body.requests[0].stmt.sql;
      assert.equal(query, 'SELECT * FROM "meters" LIMIT 101');
      const records = sql.prepare(query).all();
      return Response.json({ results:[{ type:'ok', response:{ type:'execute', result:{
        cols:[{name:'site'},{name:'kwh'}],rows:records.map(r=>[{type:'text',value:r.site},{type:'integer',value:String(r.kwh)}])
      } } },{type:'ok',response:{type:'close'}}] });
    }
    assert.equal(url,'https://api.eu-central-1.aws.neon.tech/sql');
    assert.equal(options.headers['Neon-Connection-String'],env.ATLAS_EXTERNAL_POSTGRES_URL);
    assert.deepEqual(body, {query:'SELECT * FROM "public"."meters" LIMIT 101',params:[]});
    return Response.json({fields:[{name:'site'},{name:'kwh'}],rows:[['school','0']]});
  };
  const worker = createWorker({},'<!--CONTENT-->',[],{records:[]},"'none'",{fetcher});
  const call = (route, cookie, data, form = false) => worker.fetch(new Request(origin + route,{
    method:data===undefined?'GET':'POST', headers:{origin,...(cookie&&{cookie}),'content-type':form?'application/x-www-form-urlencoded':'application/json'},
    ...(data===undefined?{}:{body:form?new URLSearchParams(data):JSON.stringify(data)})
  }),env);
  const pass = randomBytes(18).toString('hex');
  const setup = await call('/access/setup','',{setup:'TESTTESTTESTTEST',email:'operator@example.test',password:pass,confirm:pass},true);
  const admin = setup.headers.get('set-cookie').split(';')[0];
  const guest = (await call('/access/guest','',{code:env.ATLAS_INITIAL_GUEST_CODE},true)).headers.get('set-cookie').split(';')[0];
  const base = '/api/external-sources';
  for (const [cookie,code] of [['',401],[guest,403]]) {
    for (const suffix of ['', '/api/save','/sql/read']) assert.equal((await call(base+suffix,cookie,suffix?{revision:0}:undefined)).status,code);
  }
  const action = (kind, name, revision, config) => call(base+'/'+kind+'/'+name,admin,{revision,config});
  const config = {endpoint:api,recordsPath:'data.items'};
  assert.equal((await (await action('api','save',0,config)).json()).ready,false);
  assert.equal((await action('api','save',0,config)).status,409);
  assert.equal((await action('api','read',1)).status,409);
  await action('sql','save',0,{driver:'libsql',relation:'meters'});
  assert.equal((await action('sql','read',1)).status,409);
  assert.deepEqual(calls,[]);
  env.ATLAS_EXTERNAL_API_URL = api + '?format=json';
  env.ATLAS_EXTERNAL_API_TOKEN = randomBytes(24).toString('hex');
  env.ATLAS_EXTERNAL_LIBSQL_URL = 'libsql://example.turso.io';
  env.ATLAS_EXTERNAL_LIBSQL_TOKEN = randomBytes(24).toString('hex');
  const loaded = await (await call(base,admin)).json();
  assert.ok(loaded.sources.every(x=>x.ready && x.revision===1));
  assert.ok(!JSON.stringify(loaded).includes(env.ATLAS_EXTERNAL_API_TOKEN));
  assert.deepEqual((await (await action('api','read',1)).json()).rows,apiRows);
  assert.deepEqual((await (await action('sql','read',1)).json()).rows,[{site:'school',kwh:'0'}]);
  apiRows = [];
  assert.deepEqual((await (await action('api','read',1)).json()).rows,[]);
  apiRows = Array.from({length:110}, (_,i)=>({i}));
  const capped = await (await action('api','read',1)).json();
  assert.equal(capped.truncated,true); assert.equal(capped.rows.length,100);
  assert.equal((await action('sql','save',1,{driver:'libsql',relation:'two words'})).status,400);
  assert.equal((await action('api','save',1,{endpoint:api+'?key=value'})).status,400);
  await action('api','save',1,{endpoint:'https://other.example/meters'});
  const before = calls.length;
  assert.equal((await action('api','read',2)).status,409);
  assert.equal(calls.length,before);
  env.ATLAS_EXTERNAL_POSTGRES_URL = 'postgresql://reader:fixture@ep-blue-demo.eu-central-1.aws.neon.tech/test';
  await action('sql','save',1,{driver:'postgres',relation:'public.meters'});
  assert.deepEqual((await (await action('sql','read',2)).json()).rows,[{site:'school',kwh:'0'}]);
  assert.ok(!JSON.stringify(await (await call(base,admin)).json()).includes(env.ATLAS_EXTERNAL_POSTGRES_URL));
});
