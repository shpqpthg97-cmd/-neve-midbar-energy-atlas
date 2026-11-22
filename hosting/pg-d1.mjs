// D1-compatible adapter over PostgreSQL (Supabase), used only by the Render host.
// The Worker code keeps its SQLite/D1 statements; this file translates the few
// dialect differences and exposes prepare().bind().first/all/run and batch().
import pg from 'pg';
import { schemaQuery } from '../worker/database.mjs';

// int8 (bigint) columns hold epoch seconds and counters; all fit in a JS number.
pg.types.setTypeParser(20, value => Number(value));

const SCHEMA_TABLES = ['atlas_admin', 'atlas_guests', 'atlas_attempts', 'atlas_sessions', 'atlas_projects',
  'atlas_feedback', 'atlas_sync_settings', 'atlas_sync_runs', 'atlas_sync_current', 'atlas_location_imports',
  'atlas_asset_locations', 'atlas_external_sources'];
const SCHEMA_INDEXES = ['atlas_feedback_created', 'atlas_sync_one_running'];

// Column types used to cast untyped parameters in "INSERT ... SELECT ?,?" statements.
const COLUMN_TYPES = {
  atlas_sync_current: { source: 'text', run_id: 'text', payload: 'text', updated_at: 'bigint' },
  atlas_asset_locations: { asset_key: 'text', asset_id: 'text', x: 'double precision', y: 'double precision',
    basis: 'text', observed_on: 'text', import_id: 'text', updated_at: 'bigint' },
};
const RESERVED = new Set(['trigger', 'cursor']);

const cache = new Map();
export function translate(sql) {
  if (cache.has(sql)) return cache.get(sql);
  let out = sql.replace(/`/g, '"');
  // PostgreSQL needs qualified columns inside ON CONFLICT DO UPDATE (excluded.* is also in scope).
  out = out.replace('DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE MIN(attempts + 1, ?) END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END',
    'DO UPDATE SET attempts = CASE WHEN atlas_attempts.reset_at <= ? THEN 1 ELSE LEAST(atlas_attempts.attempts + 1, ?) END, reset_at = CASE WHEN atlas_attempts.reset_at <= ? THEN ? ELSE atlas_attempts.reset_at END');
  const insertSelect = /^INSERT INTO (\w+) \(([^)]+)\) SELECT ((?:\?,)*\?) WHERE/.exec(out);
  if (insertSelect && COLUMN_TYPES[insertSelect[1]]) {
    const types = COLUMN_TYPES[insertSelect[1]];
    const casts = insertSelect[2].split(',').map(c => '?::' + types[c.trim()]).join(',');
    out = out.replace('SELECT ' + insertSelect[3] + ' WHERE', 'SELECT ' + casts + ' WHERE');
  }
  // Quote column names that are keywords in PostgreSQL when used unquoted in lists.
  out = out.replace(/\b(trigger|cursor)\b(?=\s*(?:[,=)<>]|$))/g, (m, word) => RESERVED.has(word) ? '"' + word + '"' : m);
  // Positional parameters outside string literals.
  let n = 0, quoted = false, result = '';
  for (const ch of out) {
    if (ch === "'") quoted = !quoted;
    result += ch === '?' && !quoted ? '$' + (++n) : ch;
  }
  cache.set(sql, result);
  return result;
}

const value = v => typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v;

// Mirror the D1/SQLite error text the Worker matches for duplicate guest codes.
function mapError(error) {
  if (error?.code === '23505') {
    const column = /Key \(([^)]+)\)=/.exec(error.detail || '')?.[1] || '';
    const wrapped = new Error('UNIQUE constraint failed: ' + (error.table || '') + '.' + column.split(', ').join(', ' + (error.table || '') + '.'));
    wrapped.cause = { message: wrapped.message };
    return wrapped;
  }
  return error;
}

export function postgresDatabase(connectionString, { expectedSchema = [], max = 5, schema = 'atlas' } = {}) {
  const pool = new pg.Pool({
    connectionString,
    max,
    ssl: /localhost|127\.0\.0\.1|\/var\/|host=\//.test(connectionString) ? false : { rejectUnauthorized: false },
    options: '-c search_path=' + schema,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', () => {});

  async function schemaRows(client) {
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname=$1", [schema]);
    const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname=$1", [schema]);
    const haveT = new Set(tables.rows.map(r => r.tablename)), haveI = new Set(indexes.rows.map(r => r.indexname));
    const ok = SCHEMA_TABLES.every(t => haveT.has(t)) && SCHEMA_INDEXES.every(i => haveI.has(i));
    return ok ? expectedSchema : [];
  }

  async function exec(client, sql, args) {
    if (sql === schemaQuery) return { rows: await schemaRows(client), rowCount: 0 };
    try { return await client.query(translate(sql), args.map(value)); } catch (error) { throw mapError(error); }
  }

  function prepare(sql) {
    let args = [];
    const api = {
      bind(...a) { args = a; return api; },
      async first(column) {
        const { rows } = await exec(pool, sql, args);
        const row = rows[0] || null;
        return column && row ? row[column] ?? null : row;
      },
      async all() { const { rows } = await exec(pool, sql, args); return { results: rows, success: true }; },
      async run() { const r = await exec(pool, sql, args); return { success: true, results: r.rows, meta: { changes: r.rowCount ?? 0 } }; },
      _run: async client => { const r = await exec(client, sql, args); return { success: true, results: r.rows, meta: { changes: r.rowCount ?? 0 } }; },
    };
    return api;
  }

  async function batch(statements) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = [];
      for (const s of statements) out.push(await s._run(client));
      await client.query('COMMIT');
      return out;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return { prepare, batch, pool, close: () => pool.end() };
}
