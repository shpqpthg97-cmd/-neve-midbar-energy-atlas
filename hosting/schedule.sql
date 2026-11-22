-- Daily source refresh at 03:15 UTC (05:15 Israel winter time). Replace the two placeholders.
-- The key is stored in Supabase Vault, not in the job text.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT vault.create_secret('<ATLAS_SYNC_KEY>', 'atlas_sync_key');
SELECT cron.schedule('atlas-source-sync', '15 3 * * *', $$
  SELECT net.http_post(
    url := '<ATLAS_ORIGIN>/internal/source-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'atlas_sync_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$$);
