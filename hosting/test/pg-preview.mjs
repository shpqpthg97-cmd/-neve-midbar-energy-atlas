// Test-only stand-in for scripts/sqlite-preview.mjs: each localDatabase() call gets a
// fresh PostgreSQL schema, so the existing Worker tests run unchanged against Postgres.
import fs from 'node:fs';
import { postgresDatabase } from '../pg-d1.mjs';
import { expectedSchema } from '../../scripts/schema.mjs';
const url = process.env.ATLAS_TEST_PG;
const ddl = fs.readFileSync(new URL('../postgres-schema.sql', import.meta.url), 'utf8');
let count = 0;
const pools = [];
process.on('beforeExit', () => { for (const p of pools.splice(0)) p.end(); });
const setup = postgresDatabase(url, { max: 1, schema: 'public' });
export function localDatabase() {
  const schema = 't' + process.pid + '_' + (++count);
  const ready = setup.pool.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE;' + ddl.replaceAll('atlas.', schema + '.').replace('CREATE SCHEMA IF NOT EXISTS atlas', 'CREATE SCHEMA ' + schema).replace("schemaname='atlas'", "schemaname='" + schema + "'"));
  const db = postgresDatabase(url, { expectedSchema, max: 1, schema });
  pools.push(db.pool);
  if (pools.length === 1) pools.push(setup.pool);
  const wrap = fn => async (...a) => { await ready; return fn(...a); };
  const prepare = sql => { const s = db.prepare(sql); for (const k of ['first', 'all', 'run', '_run']) s[k] = wrap(s[k]); const bind = s.bind; s.bind = (...a) => { bind(...a); return s; }; return s; };
  // Tests call sqlite.exec synchronously; one pooled connection keeps the order.
  const sqlite = { exec: sql => { ready.then(() => db.pool.query(sql)); }, close() {} };
  return { prepare, batch: wrap(db.batch), sqlite };
}
