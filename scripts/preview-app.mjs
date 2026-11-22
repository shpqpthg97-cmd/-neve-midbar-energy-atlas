import { localCredentials } from './local-secrets.mjs';
import { demoWorker } from './demo-fixture.mjs';
import { localDatabase } from './sqlite-preview.mjs';
import { serveLocal } from './local-server.mjs';

if (process.env.NODE_ENV === 'production') throw new Error('Demo is local only.');
const { setup, guest, secrets } = localCredentials();
const env = { ...secrets, DB: localDatabase() };
serveLocal(await demoWorker(), env, Number(process.env.PORT || 4174), url => {
  // These ephemeral codes are shown only in the interactive local demo terminal.
  console.log('Local demo setup', url + '/?mode=setup', '\nOne-time setup code', setup, '\nLocal guest PIN', guest);
});
