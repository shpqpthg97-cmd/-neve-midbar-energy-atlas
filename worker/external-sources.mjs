const kinds = ['api', 'sql'];
const drivers = ['postgres', 'libsql'];
const identifier = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const maxRows = 100;
const maxBytes = 1024 * 1024;

class SourceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function publicUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new SourceError('נדרשת כתובת HTTPS תקינה.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname) ||
      /\.(?:local|internal|localhost|test|invalid)$/i.test(url.hostname)) {
    throw new SourceError('נדרשת כתובת HTTPS של שרת חיצוני, ללא פרטי גישה.');
  }
  return url;
}

function validate(kind, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SourceError('הגדרה לא תקינה.');
  const field = (key, limit) => {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > limit) throw new SourceError('ערך השדה לא תקין.');
    return value.trim();
  };
  if (kind === 'api') {
    const endpoint = field('endpoint', 1000);
    if (endpoint && publicUrl(endpoint).search) throw new SourceError('יש להזין כתובת ללא פרמטרים. פרמטרים קבועים מוגדרים בשרת.');
    const recordsPath = field('recordsPath', 128);
    if (recordsPath && !recordsPath.split('.').every(key => /^[a-zA-Z0-9_-]+$/.test(key))) {
      throw new SourceError('נתיב הרשומות צריך להכיל שמות שדות המופרדים בנקודה.');
    }
    return { endpoint: endpoint ? publicUrl(endpoint).href : '', recordsPath };
  }
  const driver = field('driver', 16) || 'postgres';
  const relation = field('relation', 127);
  const parts = relation.split('.');
  if (!drivers.includes(driver) || (relation && (parts.length > (driver === 'postgres' ? 2 : 1) || !parts.every(p => identifier.test(p))))) {
    throw new SourceError('יש לבחור מנוע נתמך ולהזין שם טבלה או תצוגה תקין.');
  }
  return { driver, relation };
}

function binding(kind, config, env) {
  if (kind === 'api') {
    if (!config.endpoint || !env.ATLAS_EXTERNAL_API_URL) return null;
    const url = publicUrl(env.ATLAS_EXTERNAL_API_URL);
    const visible = new URL(url);
    visible.search = '';
    if (visible.href !== config.endpoint) return null;
    return { url: url.href, token: env.ATLAS_EXTERNAL_API_TOKEN };
  }
  if (!config.relation) return null;
  if (config.driver === 'postgres') {
    if (!env.ATLAS_EXTERNAL_POSTGRES_URL) return null;
    let dsn;
    try { dsn = new URL(env.ATLAS_EXTERNAL_POSTGRES_URL); } catch { return null; }
    if (!['postgres:', 'postgresql:'].includes(dsn.protocol) || !dsn.username || !dsn.password ||
        !/^ep-[a-z0-9-]+\.(?:[a-z0-9-]+\.)+neon\.tech$/i.test(dsn.hostname) ||
        (dsn.port && dsn.port !== '5432') || dsn.pathname.length < 2) return null;
    const host = dsn.hostname.replace(/^[^.]+\./, 'api.');
    return { url: 'https://' + host + '/sql', dsn: dsn.href };
  }
  if (!env.ATLAS_EXTERNAL_LIBSQL_URL || !env.ATLAS_EXTERNAL_LIBSQL_TOKEN) return null;
  const url = publicUrl(env.ATLAS_EXTERNAL_LIBSQL_URL.replace(/^libsql:\/\//, 'https://'));
  if (url.search || url.pathname !== '/') return null;
  return { url: new URL('/v2/pipeline', url).href, token: env.ATLAS_EXTERNAL_LIBSQL_TOKEN };
}

function isReady(kind, config, env) {
  try { return Boolean(binding(kind, config, env)); } catch { return false; }
}

async function profile(kind, env) {
  const row = await env.DB.prepare('SELECT config, revision FROM atlas_external_sources WHERE kind = ?').bind(kind).first();
  const config = row ? JSON.parse(row.config) : validate(kind, {});
  return { kind, config, revision: row?.revision ?? 0, ready: isReady(kind, config, env) };
}

async function readJson(url, init, fetcher) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetcher(url, { ...init, redirect: 'error', signal: controller.signal });
    if (!r.ok) throw new SourceError('המקור החזיר שגיאה (HTTP ' + r.status + '). בדקו כתובת והרשאת קריאה.', 502);
    if (!r.body || !/\bjson\b/i.test(r.headers.get('content-type') || '')) throw new SourceError('המקור לא החזיר JSON.', 502);
    const reader = r.body.getReader();
    let size = 0;
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        controller.abort();
        await reader.cancel();
        throw new SourceError('התשובה גדולה מ־1 MiB. יש לצמצם את הנתונים במקור.', 502);
      }
      text += decoder.decode(value, { stream: true });
    }
    try { return JSON.parse(text + decoder.decode()); }
    catch { throw new SourceError('המקור החזיר JSON לא תקין.', 502); }
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError('לא ניתן לקרוא מהמקור. בדקו זמינות, כתובת והרשאות.', 502);
  } finally { clearTimeout(timer); }
}

async function retrieve(kind, config, env, fetcher) {
  let target;
  try { target = binding(kind, config, env); } catch { /* invalid deployment settings */ }
  if (!target) throw new SourceError('החיבור טרם מוכן. בדקו את הטיוטה ואת הגדרות המקור בשרת.', 409);
  const headers = { Accept: 'application/json' };
  if (target.token) headers.Authorization = 'Bearer ' + target.token;
  let rows;
  if (kind === 'api') {
    let data = await readJson(target.url, { method: 'GET', headers }, fetcher);
    if (config.recordsPath) {
      for (const key of config.recordsPath.split('.')) data = data && Object.hasOwn(data, key) ? data[key] : undefined;
    }
    rows = data;
  } else {
    const relation = config.relation.split('.').map(name => '"' + name + '"').join('.');
    const sql = 'SELECT * FROM ' + relation + ' LIMIT ' + (maxRows + 1);
    headers['Content-Type'] = 'application/json';
    let body;
    if (config.driver === 'postgres') {
      headers['Neon-Connection-String'] = target.dsn;
      headers['Neon-Array-Mode'] = 'true';
      headers['Neon-Raw-Text-Output'] = 'true';
      body = { query: sql, params: [] };
    } else {
      body = { requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] };
    }
    const data = await readJson(target.url, { method: 'POST', headers, body: JSON.stringify(body) }, fetcher);
    const pg = config.driver === 'postgres';
    const result = pg ? data : data?.results?.[0]?.response?.result;
    const fields = pg ? result?.fields : result?.cols;
    if (!Array.isArray(fields) || !fields.every(f => typeof f?.name === 'string') || !Array.isArray(result?.rows)) {
      throw new SourceError('שליפת SQL נכשלה. בדקו את שם הטבלה והרשאות הקריאה.', 502);
    }
    rows = result.rows.map(values => {
      if (!Array.isArray(values) || values.length !== fields.length) throw new SourceError('מבנה שורת SQL לא תקין.', 502);
      return Object.fromEntries(fields.map((f, i) => [f.name, pg ? values[i] : (values[i]?.value ?? values[i]?.base64 ?? null)]));
    });
  }
  if (!Array.isArray(rows) || !rows.slice(0, maxRows).every(row => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new SourceError('נדרש מערך של רשומות. בדקו את נתיב הרשומות והמבנה במקור.', 502);
  }
  return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows, fetchedAt: new Date().toISOString() };
}

export async function externalSourcesApi(request, env, auth, { json, limitedBody, fetcher = fetch }) {
  if (!auth) return json({ error: 'נדרשת התחברות.' }, 401);
  if (auth.role !== 'admin') return json({ error: 'גישה למנהל בלבד.' }, 403);
  const base = '/api/external-sources';
  const path = new URL(request.url).pathname;
  if (path === base && request.method === 'GET') return json({ sources: await Promise.all(kinds.map(kind => profile(kind, env))) });
  const match = /^\/api\/external-sources\/(api|sql)\/(save|read)$/.exec(path);
  if (!match) return json({ error: 'נתיב לא נמצא.' }, 404);
  if (request.method !== 'POST') return json({ error: 'נדרשת בקשת POST.' }, 405);
  const [, kind, action] = match;
  try {
    let input;
    try { input = JSON.parse(await limitedBody(request)); } catch { throw new SourceError('הבקשה אינה תקינה או גדולה מדי.'); }
    if (!Number.isSafeInteger(input?.revision) || input.revision < 0) throw new SourceError('נדרשת גרסת הגדרות תקינה.');
    const conflict = () => new SourceError('ההגדרות שונו במפגש אחר. פתחו מחדש את המסך.', 409);
    if (action === 'read') {
      const saved = await profile(kind, env);
      if (saved.revision !== input.revision) throw conflict();
      return json(await retrieve(kind, saved.config, env, fetcher));
    }
    const serialized = JSON.stringify(validate(kind, input.config));
    const q = input.revision === 0
      ? env.DB.prepare('INSERT INTO atlas_external_sources (kind, config, revision) VALUES (?, ?, 1) ON CONFLICT(kind) DO NOTHING RETURNING revision').bind(kind, serialized)
      : env.DB.prepare('UPDATE atlas_external_sources SET config = ?, revision = revision + 1 WHERE kind = ? AND revision = ? RETURNING revision').bind(serialized, kind, input.revision);
    if (!(await q.first())) throw conflict();
    return json(await profile(kind, env));
  } catch (e) {
    if (!(e instanceof SourceError)) throw e;
    return json({ error: e.message }, e.status);
  }
}
