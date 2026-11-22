// Only schema metadata is read. Include triggers/indexes on any Atlas table.
// SQLite stores internal constraint indexes with a null SQL definition.
export const schemaQuery = `SELECT type, name, tbl_name, sql FROM sqlite_schema
  WHERE sql IS NOT NULL AND (name GLOB 'atlas_*' OR tbl_name GLOB 'atlas_*')
  ORDER BY type, name`;

export function sameSchema(actual, expected) {
  return actual.length === expected.length && expected.every((entry, index) =>
    ['type', 'name', 'tbl_name', 'sql'].every(key => entry[key] === actual[index][key]));
}

export async function databaseReady(db, expected) {
  if (!db || !expected?.length) return false;
  const { results } = await db.prepare(schemaQuery).all();
  return sameSchema(results, expected);
}
