import fs from 'node:fs/promises';
import { localDatabase } from './sqlite-preview.mjs';
import { localCredentials } from './local-secrets.mjs';
import { serveLocal } from './local-server.mjs';
import worker from '../dist/server/index.js';

if (process.env.NODE_ENV === 'production') throw new Error('Development server is local only.');
// Preserve the existing JSON format and path of the developer's local database.
async function developmentSecrets() {
  try {
    return JSON.parse(await fs.readFile('.dev.vars', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    await fs.stat('.preview/auth.db');
    throw new Error('Restore .dev.vars for the existing development database.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const { secrets, setup, guest } = localCredentials();
  await fs.writeFile('.dev.vars', JSON.stringify(secrets), { flag:'wx', mode:0o600 });
  console.log('First local setup code:', setup, '\nInitial local guest PIN:', guest);
  return secrets;
}
const secrets = await developmentSecrets();
await fs.mkdir('.preview', { recursive: true });
serveLocal(worker, { ...secrets, DB: localDatabase('.preview/auth.db') },
  Number(process.env.PORT || 4173), url => console.log('Development:', url));
