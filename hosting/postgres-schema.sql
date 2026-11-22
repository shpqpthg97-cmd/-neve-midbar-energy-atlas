-- PostgreSQL schema for hosting the atlas on Render + Supabase.
-- Same 12 tables, columns and named indexes as drizzle/0000..0004 (SQLite/D1).
-- Kept in a private schema that the Supabase Data API does not expose.
CREATE SCHEMA IF NOT EXISTS atlas;

CREATE TABLE IF NOT EXISTS atlas.atlas_admin (
 id text PRIMARY KEY NOT NULL,
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 salt text NOT NULL,
 recovery_hash text NOT NULL,
 version bigint DEFAULT 1 NOT NULL,
 created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS atlas.atlas_guests (
 id text PRIMARY KEY NOT NULL,
 name text NOT NULL,
 profession text DEFAULT '' NOT NULL,
 code_hash text NOT NULL UNIQUE,
 active bigint DEFAULT 1 NOT NULL,
 expires_at bigint DEFAULT 0 NOT NULL,
 version bigint DEFAULT 1 NOT NULL,
 created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS atlas.atlas_attempts (
 key text PRIMARY KEY NOT NULL,
 attempts bigint NOT NULL,
 reset_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS atlas.atlas_sessions (
 id text PRIMARY KEY NOT NULL,
 last_seen bigint NOT NULL,
 expires_at bigint NOT NULL,
 document_used bigint DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS atlas.atlas_projects (
 id text PRIMARY KEY NOT NULL,
 asset_key text NOT NULL UNIQUE,
 asset_json text NOT NULL,
 title text NOT NULL,
 technology text NOT NULL,
 status text DEFAULT 'active' NOT NULL,
 owner text DEFAULT '' NOT NULL,
 target_date text DEFAULT '' NOT NULL,
 version bigint DEFAULT 1 NOT NULL,
 payload text NOT NULL,
 created_at bigint NOT NULL,
 updated_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS atlas.atlas_feedback (
 id text PRIMARY KEY NOT NULL,
 request_id text NOT NULL,
 author_id text NOT NULL,
 author_role text NOT NULL,
 author_name text NOT NULL,
 sender_name text DEFAULT '' NOT NULL,
 asset_key text DEFAULT '' NOT NULL,
 category text NOT NULL,
 body text NOT NULL,
 status text DEFAULT 'new' NOT NULL,
 admin_note text DEFAULT '' NOT NULL,
 created_at bigint NOT NULL,
 updated_at bigint NOT NULL,
 UNIQUE (author_id, author_role, request_id)
);
CREATE INDEX IF NOT EXISTS atlas_feedback_created ON atlas.atlas_feedback (created_at, id);
CREATE TABLE IF NOT EXISTS atlas.atlas_sync_settings (source text PRIMARY KEY NOT NULL, enabled bigint DEFAULT 1 NOT NULL, schedule_id text DEFAULT '' NOT NULL, schedule_label text DEFAULT '' NOT NULL, updated_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS atlas.atlas_sync_runs (id text PRIMARY KEY NOT NULL, source text NOT NULL, status text NOT NULL, "trigger" text NOT NULL, started_at bigint NOT NULL, finished_at bigint, source_updated_at bigint, metadata text NOT NULL, targets text NOT NULL, "cursor" bigint DEFAULT 0 NOT NULL, results text DEFAULT '{}' NOT NULL, summary text DEFAULT '{}' NOT NULL, error text DEFAULT '' NOT NULL, version bigint DEFAULT 1 NOT NULL, lease_until bigint DEFAULT 0 NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS atlas_sync_one_running ON atlas.atlas_sync_runs (source) WHERE status='running';
CREATE TABLE IF NOT EXISTS atlas.atlas_sync_current (source text PRIMARY KEY NOT NULL, run_id text NOT NULL, payload text NOT NULL, updated_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS atlas.atlas_location_imports (id text PRIMARY KEY NOT NULL, filename text NOT NULL, payload text NOT NULL, status text DEFAULT 'pending' NOT NULL, created_at bigint NOT NULL, reviewed_at bigint, review_note text DEFAULT '' NOT NULL);
CREATE TABLE IF NOT EXISTS atlas.atlas_asset_locations (asset_key text PRIMARY KEY NOT NULL, asset_id text NOT NULL, x double precision NOT NULL, y double precision NOT NULL, basis text NOT NULL, observed_on text NOT NULL, import_id text NOT NULL, updated_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS atlas.atlas_external_sources (
  kind text PRIMARY KEY NOT NULL CHECK (kind IN ('api', 'sql')),
  config text NOT NULL,
  revision bigint NOT NULL
);

-- Defense in depth: row level security on, no policies, so the public API roles see nothing.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='atlas' LOOP
    EXECUTE format('ALTER TABLE atlas.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
