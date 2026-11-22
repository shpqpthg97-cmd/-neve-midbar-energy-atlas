import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import worker from '../dist/cloudflare/worker.mjs';
import site from '../dist/server/index.js';
import { expectedSchema, migrations, migrateLocal } from '../scripts/schema.mjs';
import { demoWorker } from '../scripts/demo-fixture.mjs';
import { localDatabase } from '../scripts/sqlite-preview.mjs';
import { checkTarget } from '../scripts/check-d1.mjs';
import { productionConfig } from '../scripts/production-config.mjs';
import { schemaQuery } from '../worker/database.mjs';

const origin = 'https://atlas.test';
const setup = 'TESTTESTTESTTEST';
const password = randomBytes(20).toString('hex');
const account = { setup, password, confirm: password, email:'operator@example.test' };
const envFor = db => ({ DB:db, ATLAS_ACCESS_HASH:createHash('sha256').update(setup).digest('hex'),
  ATLAS_SESSION_KEY:randomBytes(32).toString('hex'), ATLAS_INITIAL_GUEST_CODE:'5081', ATLAS_ORIGIN:origin, ATLAS_ENVIRONMENT:'production' });
const get = (p, cookie) => new Request(origin + p, { headers:cookie ? {cookie} : {} });
const post = (p, data, { cookie, form, headers } = {}) => new Request(origin + p, {
  method:'POST', headers:{origin,'content-type':form ? 'application/x-www-form-urlencoded' : 'application/json', ...(cookie && {cookie}), ...headers},
  body:form ? new URLSearchParams(data) : JSON.stringify(data),
});
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];

test('readiness checks exact schema, returns no records, never falls back to protected assets', async () => {
  const db = localDatabase();
  const env = envFor(db);
  const ok = await worker.fetch(get('/health/ready'),env);
  assert.deepEqual(await ok.json(), {ready:true});
  assert.match(ok.headers.get('cache-control'), /no-store/);
  const admin = cookieOf(await worker.fetch(post('/access/setup', account, {form:true}),env));
  for (const broken of [null, {prepare(){throw Error('internal database details');}}]) {
    for (const route of ['/health/ready','/','/data.json','/api/feedback','/energy/grid-checks.json']) {
      const r = await worker.fetch(get(route,admin),{...env,DB:broken});
      assert.equal(r.status,503,route);
      assert.doesNotMatch(await r.text(), /internal database details|SEMEL_MOSAD|operator@example/);
    }
  }
  for (const route of ['/data.json','/api/account','/api/projects','/design/shell.js','/energy/roofs.json','/energy/grid-checks.json','/api/sync/status']) {
    for (const method of ['GET','HEAD']) {
      const r=await worker.fetch(new Request(origin+route+'?qa_role=admin&demo=true',{method}),env);
      assert.equal(r.status,401,method+' '+route);
    }
  }
  assert.equal((await worker.fetch(get('/health/ready'),{...env, ATLAS_ENVIRONMENT:'demo'})).status,503);
  assert.equal((await worker.fetch(new Request('https://wrong.test/data.json'),env)).status,503);
  db.sqlite.exec('DROP INDEX atlas_feedback_created');
  assert.equal((await worker.fetch(get('/health/ready'),env)).status,503);
  db.sqlite.close();
});

test('standalone MCP authorizes the existing administrator or authenticated identity gateway only', async () => {
  const env=envFor(localDatabase());
  const admin=cookieOf(await worker.fetch(post('/access/setup',account,{form:true}),env));
  const guest=cookieOf(await worker.fetch(post('/access/guest',{code:'5081'},{form:true}),env));
  const headers={'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':account.email};
  const rpc={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'atlas_sync_status'}};
  const call=async h=>(await (await worker.fetch(post('/mcp',rpc,h),env)).json()).result;
  assert.equal((await call({headers})).isError,true);
  assert.equal((await call({headers,cookie:guest})).isError,true);
  assert.equal((await call({cookie:admin})).isError,undefined);
  assert.equal((await call({cookie:admin,headers:{origin:'https://other.test'}})).isError,true);
  env.ATLAS_MCP_GATEWAY_KEY=randomBytes(32).toString('hex');
  assert.equal((await call({headers:{...headers,authorization:'Bearer '+env.ATLAS_MCP_GATEWAY_KEY}})).isError,undefined);
  assert.equal((await call({headers:{...headers,'oai-authenticated-user-email':'other@example.test',authorization:'Bearer '+env.ATLAS_MCP_GATEWAY_KEY}})).isError,true);
  const managed=new Request('https://example.chatgpt.site/mcp',post('/mcp',rpc,{headers}));
  assert.equal((await (await site.fetch(managed,env)).json()).result.isError,undefined);
  env.DB.sqlite.close();
});

test('ordered migrations preserve partial and populated databases, including re-open', async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-schema-'));
  try {
    const file=path.join(dir,'local.db');
    const legacy=new DatabaseSync(file);
    legacy.exec(migrations[0].sql);
    legacy.prepare('INSERT INTO atlas_attempts VALUES (?, ?, ?)').run('sentinel',3,91);
    legacy.close();
    for (let i=0;i<2;i++) {
      const db=localDatabase(file);
      assert.equal((await db.prepare('SELECT attempts FROM atlas_attempts WHERE key=?').bind('sentinel').first()).attempts,3);
      assert.deepEqual(db.sqlite.prepare(schemaQuery).all(),expectedSchema);
      db.sqlite.close();
    }
    const broken=new DatabaseSync(file);
    broken.exec('ALTER TABLE atlas_admin ADD COLUMN custom_field TEXT');
    const before=broken.prepare(schemaQuery).all();
    assert.throws(()=>migrateLocal(broken),/Unrecognized/);
    assert.deepEqual(broken.prepare(schemaQuery).all(),before);
    assert.equal(broken.prepare('SELECT attempts FROM atlas_attempts').get().attempts,3);
    broken.close();
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});

test('production target preflight reads metadata only and rejects a conflicting binding',async()=>{
  assert.throws(()=>productionConfig({}));
  const config=productionConfig({WORKER_NAME:'atlas-check',D1_DATABASE_NAME:'isolated-test',D1_DATABASE_ID:randomUUID(),
    CLOUDFLARE_ACCOUNT_ID:randomBytes(16).toString('hex'),ATLAS_ORIGIN:'https://atlas-check.example.workers.dev'});
  assert.equal(config.assets,undefined);
  const db=config.d1_databases[0];
  const settings={bindings:[{name:'DB',type:'d1',id:db.database_id}]};
  const identity={uuid:db.database_id,name:db.database_name};
  let rows=expectedSchema;
  const fake=async(url,init)=>{
    let result;
    if(url.endsWith('/query')){
      assert.equal(init.method,'POST');
      assert.deepEqual(JSON.parse(init.body),{sql:schemaQuery});
      result=[{success:true,results:rows}];
    }else{
      assert.equal(init.method,'GET');
      if(url.endsWith('/settings'))result=settings;
      else if(url.endsWith('/secrets'))result=config.secrets.required.map(name=>({name,type:'secret_text'}));
      else { assert.ok(url.endsWith('/'+db.database_id)); result=identity; }
    }
    return Response.json({success:true,result});
  };
  await checkTarget(config,'local-test',fake);
  settings.bindings[0].id=randomUUID();
  await assert.rejects(checkTarget(config,'local-test',fake),/rebinding/);
  rows=[];
  await assert.rejects(checkTarget(config,'local-test',fake),/schema/);
  identity.name='another';
  await assert.rejects(checkTarget(config,'local-test',fake),/identity/);
});

test('demo contains one synthetic institution, separate sessions and no council evidence',async()=>{
  const demo=await demoWorker(),env=envFor(localDatabase());
  const other=envFor(localDatabase());
  assert.equal((await demo.fetch(get('/data.json?qa_role=admin'),env)).status,401);
  const admin=cookieOf(await demo.fetch(post('/access/setup',account,{form:true}),env));
  const rows=await (await demo.fetch(get('/data.json',admin),env)).json();
  assert.deepEqual(rows.map(s=>s.SEMEL_MOSAD),['TEST01']);
  const projects=await (await demo.fetch(get('/api/projects',admin),env)).json();
  assert.deepEqual(projects.catalog.map(s=>s.id),['edu:TEST01']);
  assert.equal((await demo.fetch(get('/energy/canopy-aatsam-court.jpg',admin),env)).status,404);
  assert.equal((await worker.fetch(get('/data.json',admin),other)).status,401);
  assert.equal((await other.DB.prepare('SELECT COUNT(*) n FROM atlas_admin').first()).n,0);
  env.DB.sqlite.close(); other.DB.sqlite.close();
});

test('built Worker serves every packaged file through authentication with its original content',async()=>{
  const env=envFor(localDatabase());
  const admin=cookieOf(await worker.fetch(post('/access/setup',account,{form:true}),env));
  const files=await fs.readdir('web',{recursive:true,withFileTypes:true});
  let checked=0;
  for(const entry of files.filter(e=>e.isFile())){
    const local=path.join(entry.parentPath,entry.name);
    const route='/'+path.relative('web',local).split(path.sep).join('/');
    if(route==='/index.html'){
      const anon=await worker.fetch(get(route),env);
      assert.match(await anon.text(),/action="\/access\/guest"/);
    }else{
      assert.equal((await worker.fetch(get(route),env)).status,401,route);
    }
    const r=await worker.fetch(get(route,admin),env);
    assert.equal(r.status,200,route);
    const original=await fs.readFile(local);
    if(route==='/energy/grid-checks.json')assert.deepEqual(await r.json(),JSON.parse(original));
    else assert.deepEqual(Buffer.from(await r.arrayBuffer()),original,route);
    checked++;
  }
  assert.ok(checked>=120);
  env.DB.sqlite.close();
});
