/*
  # Create listing_zips table for pre-generated ZIP downloads

  1. New Extensions
    - `pg_net` - Async HTTP calls from within SQL for triggering edge functions
    - `pg_cron` - Job scheduler for background ZIP generation polling

  2. New Tables
    - `listing_zips`
      - `id` (uuid, PK)
      - `listing_id` (uuid, FK to listings ON DELETE CASCADE)
      - `kind` (text - 'photo', 'video', 'document', 'floor_plan', 'all')
      - `status` (text - 'pending', 'generating', 'ready', 'stale', 'failed')
      - `storage_key` (text, nullable - R2 object key for the ZIP)
      - `zip_filename` (text - human-readable download filename)
      - `file_size_bytes` (bigint - size of the generated ZIP)
      - `file_count` (integer - number of files in the ZIP)
      - `asset_hash` (text - SHA-256 hash of asset IDs for change detection)
      - `skipped_reason` (text, nullable - e.g., 'exceeds_4gb')
      - `retry_count` (integer - number of generation retries)
      - `error_message` (text, nullable - last failure error)
      - `stale_since` (timestamptz, nullable - when ZIP was first marked stale)
      - `generation_started_at` (timestamptz, nullable)
      - `generated_at` (timestamptz, nullable - last successful generation time)
      - `created_at`, `updated_at` (timestamptz)

  3. Triggers
    - On media_assets INSERT/UPDATE/DELETE: marks related listing_zips as stale
    - On listings address_line_1 change: marks all listing_zips for that listing stale

  4. Cron Job
    - Runs every 30 seconds to find stale ZIPs debounced by 15s and call edge function

  5. Security
    - RLS enabled with policies for listing owners, admins, and assigned realtors
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create listing_zips table
CREATE TABLE IF NOT EXISTS public.listing_zips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo', 'video', 'document', 'floor_plan', 'all')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'stale', 'failed')),
  storage_key text,
  zip_filename text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  file_count integer NOT NULL DEFAULT 0,
  asset_hash text,
  skipped_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  stale_since timestamptz,
  generation_started_at timestamptz,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, kind)
);

-- Index for the cron poller to find work efficiently
CREATE INDEX IF NOT EXISTS idx_listing_zips_stale_pending
  ON public.listing_zips (status, stale_since)
  WHERE status IN ('stale', 'pending');

-- Index for stuck job recovery
CREATE INDEX IF NOT EXISTS idx_listing_zips_generating
  ON public.listing_zips (status, generation_started_at)
  WHERE status = 'generating';

-- updated_at trigger
CREATE OR REPLACE TRIGGER update_listing_zips_updated_at
  BEFORE UPDATE ON public.listing_zips
  FOR EACH ROW
  EXECUTE FUNCTION private.update_updated_at();

-- Enable RLS
ALTER TABLE public.listing_zips ENABLE ROW LEVEL SECURITY;

-- RLS: Photographers (listing owners) can view their listing ZIPs
CREATE POLICY "Listing owners can view their zips"
  ON public.listing_zips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_zips.listing_id
        AND listings.photographer_id = auth.uid()
    )
  );

-- RLS: Admins can view all listing ZIPs
CREATE POLICY "Admins can view all listing zips"
  ON public.listing_zips
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- RLS: Realtors assigned to a listing can view ready ZIPs
CREATE POLICY "Assigned realtors can view ready zips"
  ON public.listing_zips
  FOR SELECT
  TO authenticated
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM public.listing_realtors
      WHERE listing_realtors.listing_id = listing_zips.listing_id
        AND listing_realtors.realtor_id IN (
          SELECT r.id FROM public.realtors r WHERE r.auth_user_id = auth.uid()
        )
    )
  );

-- Trigger function to mark listing ZIPs as stale when media changes
CREATE OR REPLACE FUNCTION private.mark_listing_zips_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing_id uuid;
  v_old_kind text;
  v_new_kind text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
    v_old_kind := OLD.kind;
    v_new_kind := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_listing_id := NEW.listing_id;
    v_old_kind := NULL;
    v_new_kind := NEW.kind;
  ELSE
    v_listing_id := NEW.listing_id;
    v_old_kind := OLD.kind;
    v_new_kind := NEW.kind;
  END IF;

  -- Mark the specific kind ZIP(s) as stale
  IF v_new_kind IS NOT NULL THEN
    INSERT INTO public.listing_zips (listing_id, kind, status, stale_since)
    VALUES (v_listing_id, v_new_kind, 'stale', now())
    ON CONFLICT (listing_id, kind)
    DO UPDATE SET
      status = 'stale',
      stale_since = COALESCE(listing_zips.stale_since, now());
  END IF;

  IF v_old_kind IS NOT NULL AND v_old_kind IS DISTINCT FROM v_new_kind THEN
    INSERT INTO public.listing_zips (listing_id, kind, status, stale_since)
    VALUES (v_listing_id, v_old_kind, 'stale', now())
    ON CONFLICT (listing_id, kind)
    DO UPDATE SET
      status = 'stale',
      stale_since = COALESCE(listing_zips.stale_since, now());
  END IF;

  -- Always mark the 'all' ZIP as stale
  INSERT INTO public.listing_zips (listing_id, kind, status, stale_since)
  VALUES (v_listing_id, 'all', 'stale', now())
  ON CONFLICT (listing_id, kind)
  DO UPDATE SET
    status = 'stale',
    stale_since = COALESCE(listing_zips.stale_since, now());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to media_assets
CREATE OR REPLACE TRIGGER trg_media_assets_mark_zips_stale
  AFTER INSERT OR DELETE OR UPDATE OF kind, is_public, sort_order, original_key
  ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION private.mark_listing_zips_stale();

-- Trigger function for address changes (affects ZIP filenames)
CREATE OR REPLACE FUNCTION private.mark_listing_zips_stale_on_address_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.address_line_1 IS DISTINCT FROM NEW.address_line_1 THEN
    UPDATE public.listing_zips
    SET status = 'stale',
        stale_since = COALESCE(stale_since, now())
    WHERE listing_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to listings
CREATE OR REPLACE TRIGGER trg_listings_address_mark_zips_stale
  AFTER UPDATE OF address_line_1
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION private.mark_listing_zips_stale_on_address_change();

-- Function called by pg_cron to process stale ZIPs
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
  -- Get Supabase config from vault or settings
  SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

  -- Skip if we don't have the required config
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RETURN;
  END IF;

  -- Reset stuck jobs (generating for more than 5 minutes)
  UPDATE public.listing_zips
  SET status = 'stale',
      stale_since = COALESCE(stale_since, now())
  WHERE status = 'generating'
    AND generation_started_at < now() - interval '5 minutes';

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
    -- Mark as generating
    UPDATE public.listing_zips
    SET status = 'generating',
        generation_started_at = now()
    WHERE id = v_row.id;

    -- Invoke the edge function via pg_net
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

-- Schedule the cron job to run every 30 seconds
SELECT cron.schedule(
  'process-stale-listing-zips',
  '30 seconds',
  $$SELECT private.process_stale_listing_zips()$$
);

-- Trigger to clean up R2 ZIP files when listing_zips rows are deleted (via CASCADE)
CREATE OR REPLACE FUNCTION private.cleanup_listing_zip_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  IF OLD.storage_key IS NOT NULL THEN
    SELECT decrypted_secret INTO v_supabase_url
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_url'
      LIMIT 1;

    SELECT decrypted_secret INTO v_service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;

    IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/storage-delete',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object('key', OLD.storage_key)
      );
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_listing_zips_cleanup_storage
  BEFORE DELETE ON public.listing_zips
  FOR EACH ROW
  EXECUTE FUNCTION private.cleanup_listing_zip_storage();