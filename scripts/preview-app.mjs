import { createHash, randomBytes, randomInt } from 'node:crypto';
import { demoWorker } from './demo-fixture.mjs';
import { localDatabase } from './sqlite-preview.mjs';
import { serveLocal } from './local-server.mjs';

if (process.env.NODE_ENV === 'production') throw new Error('Demo is local only.');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const setup = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join('');
const guest = String(randomInt(10000)).padStart(4, '0');
const env = { DB: localDatabase(), ATLAS_SESSION_KEY: randomBytes(32).toString('hex'),
  ATLAS_ACCESS_HASH: createHash('sha256').update(setup).digest('hex'), ATLAS_INITIAL_GUEST_CODE: guest };
serveLocal(await demoWorker(), env, Number(process.env.PORT || 4174), url => {
  // These ephemeral codes are shown only in the interactive local demo terminal.
  console.log('Local demo setup', url + '/?mode=setup', '\nOne-time setup code', setup, '\nLocal guest PIN', guest);
});
