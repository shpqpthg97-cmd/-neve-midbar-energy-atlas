import { pathToFileURL } from 'node:url';
import { productionConfig } from './production-config.mjs';
import { expectedSchema } from './schema.mjs';
import { sameSchema, schemaQuery } from '../worker/database.mjs';

export async function checkTarget(config, token, fetcher = fetch) {
  if (!token) throw new Error('Missing Cloudflare API token.');
  const database = config.d1_databases[0];
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + config.account_id;
  async function read(path, sql) {
    const result = await fetcher(base + path, {
      method: sql ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(sql && { body: JSON.stringify({ sql }) }),
    });
    if (!result.ok) throw new Error('Cloudflare preflight failed, HTTP ' + result.status + '.');
    const body = await result.json();
    if (body.success !== true || !body.result) throw new Error('Cloudflare preflight failed.');
    return body.result;
  }
  const dbPath = '/d1/database/' + database.database_id;
  const identity = await read(dbPath);
  if (identity.uuid !== database.database_id || identity.name !== database.database_name) {
    throw new Error('D1 identity mismatch. Deployment blocked.');
  }
  const [schema] = await read(dbPath + '/query', schemaQuery);
  if (schema?.success !== true || !Array.isArray(schema.results) || !sameSchema(schema.results, expectedSchema)) {
    throw new Error('Missing or incompatible schema. Review migrations and backup before any change.');
  }
  // Provision the Worker and secrets independently before the first release.
  const settings = await read('/workers/scripts/' + config.name + '/settings');
  if (!Array.isArray(settings.bindings)) throw new Error('Cannot verify existing Worker bindings.');
  const binding = settings.bindings.find(item => item.name === 'DB');
  if (binding && (binding.type !== 'd1' || binding.id !== database.database_id)) {
    throw new Error('The current DB binding points elsewhere. Automatic rebinding is disabled.');
  }
  const secrets = await read('/workers/scripts/' + config.name + '/secrets');
  if (!Array.isArray(secrets) || !config.secrets.required.every(name => secrets.some(s => s.name === name))) {
    throw new Error('Required Worker secrets have not been configured.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkTarget(productionConfig(process.env), process.env.CLOUDFLARE_API_TOKEN);
  console.log('Read-only D1 identity, schema, Worker binding and required secret names verified.');
}
