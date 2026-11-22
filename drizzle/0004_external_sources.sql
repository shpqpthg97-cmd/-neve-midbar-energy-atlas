CREATE TABLE atlas_external_sources (
  kind TEXT PRIMARY KEY NOT NULL CHECK (kind IN ('api', 'sql')),
  config TEXT NOT NULL,
  revision INTEGER NOT NULL
);
