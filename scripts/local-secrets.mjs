import { createHash, randomBytes, randomInt } from 'node:crypto';

export function localCredentials() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const setup = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join('');
  const guest = String(randomInt(10000)).padStart(4, '0');
  return { setup, guest, secrets: {
    ATLAS_SESSION_KEY: randomBytes(32).toString('hex'),
    ATLAS_ACCESS_HASH: createHash('sha256').update(setup).digest('hex'),
    ATLAS_INITIAL_GUEST_CODE: guest,
  } };
}
