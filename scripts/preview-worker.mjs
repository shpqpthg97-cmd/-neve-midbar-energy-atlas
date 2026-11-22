import fs from 'node:fs/promises';
import { localDatabase } from './sqlite-preview.mjs';
import { serveLocal } from './local-server.mjs';
import worker from '../dist/server/index.js';

if (process.env.NODE_ENV === 'production') throw new Error('Development server is local only.');
// Preserve the existing JSON format and path of the developer's local database.
const secrets = JSON.parse(await fs.readFile('.dev.vars', 'utf8'));
await fs.mkdir('.preview', { recursive: true });
serveLocal(worker, { ...secrets, DB: localDatabase('.preview/auth.db') },
  Number(process.env.PORT || 4173), url => console.log('Development:', url));
