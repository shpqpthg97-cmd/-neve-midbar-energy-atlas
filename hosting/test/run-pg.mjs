// Runs the Worker's own regression tests against PostgreSQL through hosting/pg-d1.mjs.
// Usage: ATLAS_TEST_PG=postgresql://... node hosting/test/run-pg.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
if (!process.env.ATLAS_TEST_PG) { console.error('Set ATLAS_TEST_PG to a disposable PostgreSQL database.'); process.exit(2); }
const root = new URL('../../', import.meta.url);
// These read the SQLite handle synchronously; the PostgreSQL copy awaits the same queries.
const rewrite = { 'access-gate.mjs': s => s
  .replace("env.DB.sqlite.prepare('SELECT count(*) n FROM atlas_admin').get().n", "(await env.DB.prepare('SELECT count(*) n FROM atlas_admin').first()).n")
  .replace("rateEnv.DB.sqlite.exec('DELETE FROM atlas_attempts')", "await rateEnv.DB.prepare('DELETE FROM atlas_attempts').run()")
  .replace("rateEnv.DB.sqlite.exec('UPDATE atlas_attempts SET reset_at=0')", "await rateEnv.DB.prepare('UPDATE atlas_attempts SET reset_at=0').run()") };
const tests = ['access-gate.mjs', 'asset-delivery.mjs', 'session-lock.mjs', 'projects-feedback.mjs', 'source-sync.mjs', 'external-sources.mjs', 'design-accessibility.mjs'];
let failed = 0;
for (const name of tests) {
  let file = new URL('tests/' + name, root);
  if (rewrite[name]) {
    const copy = new URL('tests/.pg-' + name, root);
    fs.writeFileSync(copy, rewrite[name](fs.readFileSync(file, 'utf8')));
    file = copy;
  }
  const r = spawnSync(process.execPath, ['--import', new URL('register.mjs', import.meta.url).href, file.pathname], { stdio: 'inherit', timeout: 120000 });
  if (rewrite[name]) fs.rmSync(file);
  console.log((r.status === 0 ? 'PASS ' : 'FAIL ') + name);
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
