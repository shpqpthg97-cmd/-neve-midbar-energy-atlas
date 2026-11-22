// Render host for the atlas Worker: Node HTTP server + PostgreSQL (Supabase) in place of D1.
// The Worker bundle (dist/cloudflare/worker.mjs) is used unchanged and keeps all
// authentication, roles, sessions and data protection. This file only:
//  - builds requests on the configured public origin (TLS ends at Render's proxy),
//  - removes identity/authorization headers sent by clients and sets the client IP,
//  - runs the scheduled government-source refresh as the trusted gateway.
import http from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { postgresDatabase } from './pg-d1.mjs';
import { expectedSchema } from '../scripts/schema.mjs';

const env = { ...process.env, ATLAS_ENVIRONMENT: 'production' };
const origin = (env.ATLAS_ORIGIN || '').replace(/\/+$/, '');
for (const name of ['ATLAS_ORIGIN', 'DATABASE_URL', 'ATLAS_SESSION_KEY', 'ATLAS_ACCESS_HASH']) {
  if (!env[name]) console.error('Missing setting: ' + name + '. The site will answer 503 until it is set.');
}
env.ATLAS_ORIGIN = origin;
// DATABASE_URL may list several candidate connection strings separated by spaces
// (for example two Supabase pooler hosts); the first one that answers is used.
async function connect(list) {
  const candidates = String(list || '').split(/\s+/).filter(Boolean);
  for (const [index, url] of candidates.entries()) {
    const db = postgresDatabase(url, { expectedSchema });
    try { await db.prepare('SELECT 1 AS ok').first(); console.log('Database connected (candidate ' + (index + 1) + ').'); return db; }
    catch (error) { console.error('Database candidate ' + (index + 1) + ' failed: ' + error.message); await db.close().catch(() => {}); }
  }
  return candidates.length ? postgresDatabase(candidates[0], { expectedSchema }) : undefined;
}
env.DB = await connect(env.DATABASE_URL);
delete env.DATABASE_URL;

const { default: worker } = await import('../dist/cloudflare/worker.mjs');

const same = (a, b) => {
  const x = createHash('sha256').update(String(a)).digest(), y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y) && String(a) === String(b);
};
const STRIP = /^(authorization|cf-connecting-ip|oai-.*|x-atlas-.*)$/i;

function clientAddress(req) {
  const direct = req.headers['true-client-ip'];
  if (direct) return String(direct).split(',')[0].trim();
  const chain = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return chain.at(-1) || req.socket.remoteAddress || 'unknown';
}

// ---- Scheduled source refresh (IEC grid capacity + data.gov.il parcel metadata) ----
let syncRunning = false, lastSync = null;
async function mcp(name, args, email) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
  const response = await worker.fetch(new Request(origin + '/mcp', { method: 'POST', body, headers: {
    'content-type': 'application/json', authorization: 'Bearer ' + env.ATLAS_MCP_GATEWAY_KEY,
    'oai-authenticated-user-id': 'render-scheduler', 'oai-authenticated-user-email': email } }), env);
  const reply = await response.json();
  const text = reply?.result?.content?.[0]?.text || '';
  if (reply?.result?.isError) throw new Error(text || 'sync_error');
  try { return JSON.parse(text); } catch { return { text }; }
}
async function runSync() {
  if (syncRunning) return;
  syncRunning = true;
  const started = new Date().toISOString();
  try {
    const owner = await env.DB.prepare('SELECT email FROM atlas_admin LIMIT 1').first();
    if (!owner) { lastSync = { started, status: 'skipped', reason: 'no_administrator_yet' }; return; }
    const begin = await mcp('atlas_sync_start', {}, owner.email);
    if (begin.skipped) { lastSync = { started, status: 'skipped', reason: begin.reason }; return; }
    let run = begin.run, steps = 0;
    while (run?.id && run.status === 'running' && steps < 40) {
      const step = await mcp('atlas_sync_step', { run_id: run.id }, owner.email);
      run = step.run || run; steps++;
      if (step.skipped) break;
      if (step.busy) await new Promise(r => setTimeout(r, 5000));
    }
    lastSync = { started, finished: new Date().toISOString(), steps, status: run?.status || 'unknown', run: run?.id };
  } catch (error) {
    lastSync = { started, status: 'failed', error: String(error.message).slice(0, 200) };
  } finally {
    syncRunning = false;
    console.log('Source refresh:', JSON.stringify(lastSync));
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!/^\/(?!\/)/.test(req.url)) { res.writeHead(400).end(); return; }
    const path = req.url.split('?')[0];
    // Called by the daily scheduler (Supabase pg_cron). Needs the private ATLAS_SYNC_KEY.
    if (path === '/internal/source-sync') {
      const key = env.ATLAS_SYNC_KEY, gateway = env.ATLAS_MCP_GATEWAY_KEY;
      const auth = String(req.headers.authorization || '');
      if (req.method !== 'POST' || !key || key.length < 32 || !gateway || gateway.length < 32 || !same(auth, 'Bearer ' + key)) {
        res.writeHead(404).end(); return;
      }
      runSync();
      res.writeHead(202, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ accepted: true, running: syncRunning, last: lastSync }));
      return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (STRIP.test(name) || name.startsWith(':')) continue;
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('cf-connecting-ip', clientAddress(req));
    const body = ['GET', 'HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' };
    const request = new Request(origin + req.url, { method: req.method, headers, ...body });
    const result = await worker.fetch(request, env);
    const out = {};
    result.headers.forEach((value, name) => { if (name !== 'set-cookie') out[name] = value; });
    const cookies = result.headers.getSetCookie?.() || [];
    if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(result.status, out).end(req.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error('Request failed:', error?.message);
    if (!res.headersSent) res.writeHead(503, { 'Cache-Control': 'no-store' });
    res.end('Service unavailable');
  }
});
const port = Number(process.env.PORT || 10000);
server.listen(port, '0.0.0.0', () => console.log('Atlas listening on port ' + port + ' for ' + origin));
