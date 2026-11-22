import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createWorker} from '../worker/gate.mjs';
import {localDatabase} from '../scripts/sqlite-preview.mjs';

// Integration regression: Workers automatically compress a Response body when it
// declares Content-Encoding. The browser then removes ONE encoding layer. A
// pre-gzipped body passed as an ordinary Response therefore stays gzip binary.
async function browserBytes(response) {
 const body=Buffer.from(await response.arrayBuffer());
 const encoding=response.headers.get('content-encoding');
 const wire=encoding==='gzip'?gzipSync(body):body;
 return encoding==='gzip'?gunzipSync(wire):wire;
}
const values={'/index.html':['text/html','<!doctype html><html lang="he"><h1>נווה מדבר</h1><script src="app.js"></script></html>'],'/app.js':['text/javascript','document.body.dataset.ready="yes";'],'/data.json':['application/json','{"name":"נווה מדבר","schools":31}'],'/brand.css':['text/css','body { color: #193c35; }']};
const assets=Object.fromEntries(Object.entries(values).map(([p,[type,text]])=>[p,{type,body:gzipSync(text).toString('base64')}]));
const env={DB:localDatabase(),ATLAS_SESSION_KEY:'asset-delivery-test-only',ATLAS_ACCESS_HASH:createHash('sha256').update('TESTTESTTESTTEST').digest('hex'),ATLAS_INITIAL_GUEST_CODE:'0482'};
const worker=createWorker(assets,'<!--ERROR--><!--CONTENT-->');
const post=(path,body)=>new Request('https://atlas.test'+path,{method:'POST',headers:{origin:'https://atlas.test','content-type':'application/x-www-form-urlencoded','CF-Connecting-IP':'asset-test'},body:new URLSearchParams(body)});
let r=await worker.fetch(post('/access/setup',{setup:'TESTTESTTESTTEST',email:'test@example.test',password:'Long integration password!',confirm:'Long integration password!'}),env);
assert.equal(r.status,200);const admin=r.headers.get('set-cookie').split(';')[0];
r=await worker.fetch(post('/access/guest',{code:'0482'}),env);assert.equal(r.status,303);const guest=r.headers.get('set-cookie').split(';')[0];
for(const cookie of [admin,guest]){
 for(const [path,[type,expected]] of Object.entries(values)){
  r=await worker.fetch(new Request('https://atlas.test'+path,{headers:{cookie}}),env);
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),new RegExp(type));
  assert.equal((await browserBytes(r)).toString(),expected,'Browser must receive decoded '+path);
 }
 r=await worker.fetch(new Request('https://atlas.test/',{headers:{cookie}}),env);
 assert.match((await browserBytes(r)).toString(),/ננעלה/);
 // Refresh revokes this session; a protected HEAD now requires a fresh login.
 assert.equal((await worker.fetch(new Request('https://atlas.test/app.js',{headers:{cookie}}),env)).status,401);
 
}
for(const path of Object.keys(values).filter(p=>p!=='/index.html'))assert.equal((await worker.fetch(new Request('https://atlas.test'+path),env)).status,401);
console.log('Passed post-login HTML, JS, JSON, CSS delivery for admin/guest through automatic edge compression, HEAD and unauthenticated protection.');
