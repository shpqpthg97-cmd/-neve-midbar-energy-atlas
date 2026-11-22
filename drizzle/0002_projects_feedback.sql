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
