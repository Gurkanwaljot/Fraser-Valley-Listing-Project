/*
  # Fix listing_zips trigger failing on cascade delete

  When a listing is deleted, media_assets are cascade-deleted first.
  The AFTER DELETE trigger on media_assets tries to INSERT into listing_zips
  with the now-deleted listing_id, violating the FK constraint.

  Fix: Check that the referenced listing still exists before upserting into listing_zips.
*/

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

  -- Skip if the listing no longer exists (cascade delete in progress)
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = v_listing_id) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
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
