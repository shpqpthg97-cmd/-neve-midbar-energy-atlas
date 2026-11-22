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
