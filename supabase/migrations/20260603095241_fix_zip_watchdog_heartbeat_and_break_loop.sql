/*
  # Fix Watchdog That Kills Live ZIP Generation Jobs

  The previous `process_stale_listing_zips` function reset any ZIP that had
  been in `generating` state for more than 5 minutes back to `stale`. The
  same cron then immediately re-invoked the edge function, restarting work
  from file 1. For listings that legitimately take longer than 5 minutes
  to bundle (large photo sets, videos, all-assets ZIPs), this produced an
  infinite generate -> kill -> regenerate loop.

  1. Modified Functions
    - `private.process_stale_listing_zips()`
      - Stuck-job detection now uses `updated_at` as a heartbeat: a job
        is only considered dead if no progress write has landed in 90s.
      - Adds an absolute ceiling of 15 minutes as a final safety net for
        edge cases where the function dies without ever writing progress.
      - Live, progress-emitting jobs are now never reset by the watchdog.

  2. Recovery
    - Any rows currently trapped in `generating` are flipped to `failed`
      so the active loop ends. Users can retrigger generation cleanly.

  3. Notes
    - No schema changes -- function body only.
    - No RLS or policy changes.
    - Existing `update_updated_at` BEFORE UPDATE trigger already bumps
      `updated_at` on every progress write, so the heartbeat is free.
*/

CREATE OR REPLACE FUNCTION private.process_stale_listing_zips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row record;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RETURN;
  END IF;

  -- Only reset jobs that have stopped emitting heartbeat updates.
  -- A live job bumps updated_at via every progress write; if it has been
  -- silent for 90s OR has been running for 15 minutes, it's truly dead.
  UPDATE public.listing_zips
  SET status = 'failed',
      error_message = COALESCE(
        error_message,
        'Generation timed out (no heartbeat for >90s or exceeded 15 minute ceiling)'
      ),
      files_processed = 0,
      files_total = 0,
      progress_phase = NULL
  WHERE status = 'generating'
    AND (
      updated_at < now() - interval '90 seconds'
      OR generation_started_at < now() - interval '15 minutes'
    );

  -- Pick up to 3 stale ZIPs that have been stale for at least 15 seconds (debounce).
  FOR v_row IN
    SELECT id, listing_id, kind
    FROM public.listing_zips
    WHERE status = 'stale'
      AND stale_since < now() - interval '15 seconds'
      AND retry_count < 5
    ORDER BY stale_since ASC
    LIMIT 3
  LOOP
    UPDATE public.listing_zips
    SET status = 'generating',
        generation_started_at = now(),
        files_processed = 0,
        files_total = 0,
        progress_phase = NULL
    WHERE id = v_row.id;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/generate-listing-zip',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'listing_id', v_row.listing_id,
        'kind', v_row.kind
      )
    );
  END LOOP;
END;
$$;

-- Break any rows currently caught in the loop. Resetting to `failed`
-- (not `stale`) prevents the cron from immediately re-invoking them.
UPDATE public.listing_zips
SET status = 'failed',
    error_message = COALESCE(error_message, 'Recovered from generate->kill->regenerate loop'),
    files_processed = 0,
    files_total = 0,
    progress_phase = NULL
WHERE status = 'generating';
