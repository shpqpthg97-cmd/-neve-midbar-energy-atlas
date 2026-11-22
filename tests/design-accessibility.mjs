// Presentation regressions: palette contrast and exact-script CSP for the login UI.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {localDatabase} from '../scripts/sqlite-preview.mjs';
const css=await fs.readFile('web/design/tokens.css','utf8');
const blocks=[css.split(':root[data-theme=dark]')[0],css.split(':root[data-theme=dark]')[1].split(':root[data-contrast')[0]];
const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c.reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)};
for(const [mode,block] of blocks.entries()){
  const t=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-fA-F0-9]{6})/g)].map(m=>[m[1],m[2]]));
  for(const [ink,bg,min] of [['text','bg',4.5],['text-muted','surface-2',4.5],['primary','surface',4.5],['on-primary','primary',4.5],['energy-text','surface',4.5],['warning-text','surface',4.5],['success-text','surface',4.5],['danger','surface',4.5],['control-border','surface',3]]){
    const [a,b]=[lum(t[ink]),lum(t[bg])].sort((a,b)=>a-b);
    assert.ok((b+.05)/(a+.05)>=min,`${mode} ${ink} / ${bg}`);
  }
}
const {default:worker}=await import('../dist/server/index.js');
const env={DB:localDatabase(),ATLAS_SESSION_KEY:randomBytes(32).toString('hex'),ATLAS_ACCESS_HASH:randomBytes(32).toString('hex')};
for(const [mode,action,fields] of [['guest','/access/guest',['code']],['login','/access/login',['email','password']],['setup','/access/setup',['setup','email','password','confirm']]]){
  const r=await worker.fetch(new Request('https://atlas.test/?mode='+mode),env),html=await r.text(),csp=r.headers.get('content-security-policy');
  assert.equal(r.status,200);assert.ok(html.includes('dir="rtl"'));assert.ok(html.includes('action="'+action+'" method="post"'));
  for(const f of fields)assert.ok(html.includes('name="'+f+'"'),f);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
  assert.ok(csp.includes("'sha256-"+createHash('sha256').update(scripts[0][1]).digest('base64')+"'"));
  assert.match(csp,/default-src 'none'/);assert.match(csp,/form-action 'self'/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
  assert.ok(html.includes('font/woff2;base64,'));
}
assert.equal((await worker.fetch(new Request('https://atlas.test/design/shell.js'),env)).status,401);
console.log('Passed light/dark text and control contrast, original login field/actions, hashed-only presentation scripts, local fonts, and protected design assets.');
