import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { schemaQuery, sameSchema } from '../worker/database.mjs';

const migrationDir = new URL('../drizzle/', import.meta.url);
export const migrations = fs.readdirSync(migrationDir)
  .filter(name => /^\d+_.*\.sql$/.test(name)).sort()
  .map(name => ({ name, sql: fs.readFileSync(new URL(name, migrationDir), 'utf8') }));

const read = db => db.prepare(schemaQuery).all();
const reference = new DatabaseSync(':memory:');
const stages = [read(reference)];
for (const migration of migrations) {
  reference.exec(migration.sql);
  stages.push(read(reference));
}
reference.close();
export const expectedSchema = stages.at(-1);

const snapshot = new DatabaseSync(':memory:');
snapshot.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
if (!expectedSchema.length || !sameSchema(read(snapshot), expectedSchema)) {
  throw new Error('Schema snapshot and ordered migrations disagree.');
}
snapshot.close();

// Existing developer databases can predate migration bookkeeping. Only an exact
// prefix can be advanced. BEGIN IMMEDIATE serializes competing local launches.
export function migrateLocal(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = read(db);
    const stage = stages.findIndex(schema => sameSchema(current, schema));
    if (stage < 0) throw new Error('Unrecognized local schema. No changes applied.');
    for (const migration of migrations.slice(stage)) db.exec(migration.sql);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
