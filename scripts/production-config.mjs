import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const compatibilityDate = '2026-05-01';
export function productionConfig(env) {
  const { CLOUDFLARE_ACCOUNT_ID: account, D1_DATABASE_ID: id, D1_DATABASE_NAME: database,
    WORKER_NAME: name, ATLAS_ORIGIN: origin } = env;
  if (!/^[a-f0-9]{32}$/i.test(account || '') ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id || '') ||
      !/^[\w-]{1,63}$/.test(database || '') || !/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(name || '')) {
    throw new Error('Set the verified Cloudflare account, Worker name and D1 name/UUID in the production environment.');
  }
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin ||
      url.hostname.split('.')[0] !== name || !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname) || url.port) {
    throw new Error('ATLAS_ORIGIN must be the exact HTTPS workers.dev origin of this Worker.');
  }
  return { name, account_id: account, main: 'dist/cloudflare/worker.mjs', compatibility_date: compatibilityDate,
    no_bundle: true, workers_dev: true, preview_urls: false,
    vars: { ATLAS_ENVIRONMENT: 'production', ATLAS_ORIGIN: origin },
    secrets: { required: ['ATLAS_ACCESS_HASH', 'ATLAS_SESSION_KEY', 'ATLAS_INITIAL_GUEST_CODE'] },
    d1_databases: [{ binding: 'DB', database_name: database, database_id: id, migrations_dir: 'drizzle' }] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await fs.writeFile('wrangler.production.json', JSON.stringify(productionConfig(process.env), null, 2) + '\n', { mode: 0o600 });
}
