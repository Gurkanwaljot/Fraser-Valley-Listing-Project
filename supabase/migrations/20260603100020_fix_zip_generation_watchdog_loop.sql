/*
  # Fix ZIP Generation Watchdog Loop

  This migration replaces the `process_stale_listing_zips` cron function so that
  long-running ZIP jobs are no longer killed by the watchdog mid-flight.

  ## The Bug

  The previous watchdog reset any row in `generating` status whose
  `generation_started_at` was more than 5 minutes old. For large listings
  (many photos + a video), the edge function legitimately takes longer than
  5 minutes. The watchdog flipped the row to `stale`, the same cron picked
  it up, and the function restarted from file 1 -- producing the visible
  loop where progress walks 1..N and then resets back to 1.

  ## The Fix

  1. Watchdog now uses `updated_at` as a heartbeat. The edge function awaits
     a progress write after every batch of files, so any actively running
     job has a fresh `updated_at`. A row is considered stuck only if its
     heartbeat has not moved in 90 seconds.
  2. Absolute ceiling raised from 5 to 15 minutes. Even if heartbeat writes
     fail temporarily, jobs get a much wider window before being killed.
  3. Currently-stuck rows that are caught in the old loop are reset to
     `failed` with a clear message so the user sees a clean state.

  ## Modified Objects
  - `private.process_stale_listing_zips` (function body replaced)

  ## One-time Data Recovery
  - All rows currently in `generating` status are flipped to `failed` with
    a recovery message. No data is destroyed; only status fields touched.
*/

-- One-time recovery: break any rows currently caught in the loop.
UPDATE public.listing_zips
SET
  status = 'failed',
  error_message = 'Recovered from generation loop -- please retry',
  files_processed = 0,
  files_total = 0,
  progress_phase = NULL,
  generation_started_at = NULL
WHERE status = 'generating';

-- Replace the cron worker with heartbeat-based watchdog logic.
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

  -- Heartbeat-based stuck-job recovery.
  -- A row is considered stuck only if BOTH:
  --   (a) its updated_at heartbeat has not moved in 90 seconds, AND
  --   (b) the absolute generation_started_at is older than 15 minutes.
  -- This ensures actively running jobs (which write progress every few seconds)
  -- are NEVER reset by the watchdog -- which was the bug that caused the loop.
  UPDATE public.listing_zips
  SET
    status = 'failed',
    error_message = 'Generation timed out -- worker stopped responding',
    files_processed = 0,
    files_total = 0,
    progress_phase = NULL
  WHERE status = 'generating'
    AND updated_at < now() - interval '90 seconds'
    AND generation_started_at < now() - interval '15 minutes';

  -- Pick up to 3 stale ZIPs that have been stale for at least 15 seconds (debounce)
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
        generation_started_at = now()
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
