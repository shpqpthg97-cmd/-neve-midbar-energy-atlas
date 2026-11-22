CREATE TABLE `atlas_sessions` (
 `id` text PRIMARY KEY NOT NULL,
 `last_seen` integer NOT NULL,
 `expires_at` integer NOT NULL,
 `document_used` integer DEFAULT 0 NOT NULL
);
