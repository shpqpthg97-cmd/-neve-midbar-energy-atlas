import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createWorker } from '../worker/gate.mjs';
import { readLogin } from './login-presentation.mjs';
import { expectedSchema } from './schema.mjs';

// No crawler, filesystem fallback, real catalog, snapshot, evidence file or external importer.
export async function demoWorker() {
  const assets = {};
  const add = (path, type, bytes) => { assets[path] = { type, body: gzipSync(bytes).toString('base64') }; };
  for (const dir of ['', 'design/']) {
    for (const file of await fs.readdir('web/' + dir)) {
      if (!/^[\w-]+\.(css|js)$/.test(file)) continue;
      add('/' + dir + file, file.endsWith('.css') ? 'text/css' : 'text/javascript', await fs.readFile('web/' + dir + file));
    }
  }
  add('/index.html', 'text/html; charset=utf-8', await fs.readFile('web/index.html'));
  const school = { SEMEL_MOSAD: 'TEST01', SHEM_MOSAD: 'מוסד בדיקה', ISV_SHEM_ISHUV: 'יישוב בדיקה', TEUR_TAT_SUG_MISGERET: 'בית ספר' };
  const catalog = [{ id: 'edu:TEST01', key: 'edu:TEST01', name: school.SHEM_MOSAD, code: 'unassigned', locality: school.ISV_SHEM_ISHUV, kind: school.TEUR_TAT_SUG_MISGERET, group: 'education' }];
  const emptyMap = { type: 'FeatureCollection', features: [] };
  const grid = { records: [] };
  const data = { 'data.json': [school], 'sports.json': [], 'plans.geojson': emptyMap, 'boundary.geojson': emptyMap,
    'energy/canopies.json': [], 'energy/roofs.json': [], 'energy/roof-checks.json': [],
    'energy/grid-checks.json': grid, 'energy/localities.json': { localities: [], units: {} }, 'energy/summary.json': { tables: {}, warnings: [] } };
  for (const [file, value] of Object.entries(data)) add('/' + file, 'application/json', JSON.stringify(value));
  const { login, presentationCsp } = await readLogin();
  const fetcher = async () => { throw new Error('External source unavailable in isolated fixture'); };
  return createWorker(assets, login, catalog, grid, presentationCsp, { schema: expectedSchema, fetcher });
}
