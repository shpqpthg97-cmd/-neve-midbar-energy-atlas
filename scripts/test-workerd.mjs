// Real Wrangler / workerd integration. Uses only --local and an ephemeral D1 directory.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { compatibilityDate } from './production-config.mjs';

const cli = path.resolve(process.argv[2], 'node_modules/.bin/wrangler');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-workerd-'));
const config = path.join(dir, 'wrangler.json');
const state = path.join(dir, 'state');
const origin = 'http://127.0.0.1:8976';
const setup = 'TESTTESTTESTTEST';
const pin = '2804';
const password = randomBytes(24).toString('hex');
let child;
const cliEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
delete cliEnv.CLOUDFLARE_API_TOKEN;
delete cliEnv.CLOUDFLARE_ACCOUNT_ID;
try {
  await fs.writeFile(config, JSON.stringify({
    name: 'atlas-emulator', main: path.resolve('dist/cloudflare/worker.mjs'), no_bundle: true,
    compatibility_date: compatibilityDate, vars: { ATLAS_ENVIRONMENT: 'production', ATLAS_ORIGIN: origin },
    d1_databases: [{ binding: 'DB', database_name: 'ephemeral-test', database_id: randomUUID(), migrations_dir: path.resolve('drizzle') }],
  }));
  await fs.writeFile(path.join(dir, '.dev.vars'), [
    'ATLAS_SESSION_KEY=' + randomBytes(32).toString('hex'),
    'ATLAS_ACCESS_HASH=' + createHash('sha256').update(setup).digest('hex'),
    'ATLAS_INITIAL_GUEST_CODE=' + pin,
  ].join('\n'), { mode: 0o600 });
  const migrate = () => execFileSync(cli, ['d1','migrations','apply','DB','--local','--persist-to',state,'--config',config], { cwd:dir, env:cliEnv, stdio:['ignore','inherit','inherit'] });
  migrate();
  child = spawn(cli, ['dev','--local','--port','8976','--ip','127.0.0.1','--persist-to',state,'--config',config], { cwd:dir, env:cliEnv, stdio:['ignore','inherit','inherit'] });
  const read = (route, cookie) => fetch(origin + route, { headers:cookie ? { cookie } : {}, redirect:'manual' });
  const post = (route, body, cookie, form = false) => fetch(origin + route, { method:'POST', redirect:'manual',
    headers:{ origin, 'content-type':form ? 'application/x-www-form-urlencoded' : 'application/json', ...(cookie && { cookie }) },
    body:form ? new URLSearchParams(body) : JSON.stringify(body) });
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    if (child.exitCode !== null) throw new Error('Local Worker exited during startup');
    const response = await read('/health/ready').catch(() => null);
    if (response) { assert.equal(response.status, 200); ready = true; break; }
    await pause(500);
  }
  assert.ok(ready, 'Local Worker readiness timeout');
  assert.equal((await read('/data.json')).status, 401);
  const email = 'owner@example.test';
  assert.equal((await post('/access/setup', { setup, email, password, confirm:password }, '', true)).status, 200);
  const owner = await post('/access/login', { email, password }, '', true);
  assert.equal(owner.status, 303);
  const admin = owner.headers.get('set-cookie').split(';')[0];
  const guestLogin = await post('/access/guest', { code:pin }, '', true);
  assert.equal(guestLogin.status, 303);
  const guest = guestLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await read('/api/account', guest)).status, 403);
  const note = { category:'idea', body:'Emulator only', request_id:randomUUID() };
  assert.equal((await post('/api/feedback', note, guest)).status, 201);
  assert.equal((await read('/api/feedback', guest)).status, 403);
  assert.equal((await (await read('/api/feedback', admin)).json()).notes[0].body, note.body);
  // Release the local database before invoking Wrangler on the same directory again.
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
  child = null;
  migrate();
  console.log('Isolated workerd and D1 verified.');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  await fs.rm(dir, { recursive: true, force: true });
}
