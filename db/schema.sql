CREATE TABLE `atlas_admin` (
 `id` text PRIMARY KEY NOT NULL,
 `email` text NOT NULL UNIQUE,
 `password_hash` text NOT NULL,
 `salt` text NOT NULL,
 `recovery_hash` text NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `atlas_guests` (
 `id` text PRIMARY KEY NOT NULL,
 `name` text NOT NULL,
 `profession` text DEFAULT '' NOT NULL,
 `code_hash` text NOT NULL UNIQUE,
 `active` integer DEFAULT 1 NOT NULL,
 `expires_at` integer DEFAULT 0 NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `atlas_attempts` (
 `key` text PRIMARY KEY NOT NULL,
 `attempts` integer NOT NULL,
 `reset_at` integer NOT NULL
);

CREATE TABLE `atlas_sessions` (
 `id` text PRIMARY KEY NOT NULL,
 `last_seen` integer NOT NULL,
 `expires_at` integer NOT NULL,
 `document_used` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `atlas_projects` (
 `id` text PRIMARY KEY NOT NULL,
 `asset_key` text NOT NULL UNIQUE,
 `asset_json` text NOT NULL,
 `title` text NOT NULL,
 `technology` text NOT NULL,
 `status` text DEFAULT 'active' NOT NULL,
 `owner` text DEFAULT '' NOT NULL,
 `target_date` text DEFAULT '' NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `payload` text NOT NULL,
 `created_at` integer NOT NULL,
 `updated_at` integer NOT NULL
);
CREATE TABLE `atlas_feedback` (
 `id` text PRIMARY KEY NOT NULL,
 `request_id` text NOT NULL,
 `author_id` text NOT NULL,
 `author_role` text NOT NULL,
 `author_name` text NOT NULL,
 `sender_name` text DEFAULT '' NOT NULL,
 `asset_key` text DEFAULT '' NOT NULL,
 `category` text NOT NULL,
 `body` text NOT NULL,
 `status` text DEFAULT 'new' NOT NULL,
 `admin_note` text DEFAULT '' NOT NULL,
 `created_at` integer NOT NULL,
 `updated_at` integer NOT NULL,
 UNIQUE (`author_id`, `author_role`, `request_id`)
);
CREATE INDEX `atlas_feedback_created` ON `atlas_feedback` (`created_at`, `id`);

CREATE TABLE `atlas_sync_settings` (`source` text PRIMARY KEY NOT NULL, `enabled` integer DEFAULT 1 NOT NULL, `schedule_id` text DEFAULT '' NOT NULL, `schedule_label` text DEFAULT '' NOT NULL, `updated_at` integer NOT NULL);
CREATE TABLE `atlas_sync_runs` (`id` text PRIMARY KEY NOT NULL, `source` text NOT NULL, `status` text NOT NULL, `trigger` text NOT NULL, `started_at` integer NOT NULL, `finished_at` integer, `source_updated_at` integer, `metadata` text NOT NULL, `targets` text NOT NULL, `cursor` integer DEFAULT 0 NOT NULL, `results` text DEFAULT '{}' NOT NULL, `summary` text DEFAULT '{}' NOT NULL, `error` text DEFAULT '' NOT NULL, `version` integer DEFAULT 1 NOT NULL, `lease_until` integer DEFAULT 0 NOT NULL);
CREATE UNIQUE INDEX `atlas_sync_one_running` ON `atlas_sync_runs` (`source`) WHERE `status`='running';
CREATE TABLE `atlas_sync_current` (`source` text PRIMARY KEY NOT NULL, `run_id` text NOT NULL, `payload` text NOT NULL, `updated_at` integer NOT NULL);
CREATE TABLE `atlas_location_imports` (`id` text PRIMARY KEY NOT NULL, `filename` text NOT NULL, `payload` text NOT NULL, `status` text DEFAULT 'pending' NOT NULL, `created_at` integer NOT NULL, `reviewed_at` integer, `review_note` text DEFAULT '' NOT NULL);
CREATE TABLE `atlas_asset_locations` (`asset_key` text PRIMARY KEY NOT NULL, `asset_id` text NOT NULL, `x` real NOT NULL, `y` real NOT NULL, `basis` text NOT NULL, `observed_on` text NOT NULL, `import_id` text NOT NULL, `updated_at` integer NOT NULL);
