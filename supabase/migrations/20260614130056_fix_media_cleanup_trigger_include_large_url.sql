-- Fix: include large_url in media asset storage cleanup to prevent orphaned files
CREATE OR REPLACE FUNCTION private.cleanup_media_asset_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_keys jsonb := '[]'::jsonb;
  v_key_from_url text;
BEGIN
  -- Collect all storage keys to delete
  IF OLD.original_key IS NOT NULL AND OLD.original_key <> '' THEN
    v_keys := v_keys || to_jsonb(OLD.original_key);
  END IF;

  -- Extract key from thumbnail_url
  IF OLD.thumbnail_url IS NOT NULL AND OLD.thumbnail_url <> '' THEN
    v_key_from_url := regexp_replace(OLD.thumbnail_url, '^https?://[^/]+/', '');
    IF v_key_from_url IS NOT NULL AND v_key_from_url LIKE 'listings/%' THEN
      v_keys := v_keys || to_jsonb(v_key_from_url);
    END IF;
  END IF;

  -- Extract key from large_url
  IF OLD.large_url IS NOT NULL AND OLD.large_url <> '' THEN
    v_key_from_url := regexp_replace(OLD.large_url, '^https?://[^/]+/', '');
    IF v_key_from_url IS NOT NULL AND v_key_from_url LIKE 'listings/%' THEN
      v_keys := v_keys || to_jsonb(v_key_from_url);
    END IF;
  END IF;

  -- Extract key from poster_url
  IF OLD.poster_url IS NOT NULL AND OLD.poster_url <> '' THEN
    v_key_from_url := regexp_replace(OLD.poster_url, '^https?://[^/]+/', '');
    IF v_key_from_url IS NOT NULL AND v_key_from_url LIKE 'listings/%' THEN
      v_keys := v_keys || to_jsonb(v_key_from_url);
    END IF;
  END IF;

  -- Only call the edge function if we have keys to delete
  IF jsonb_array_length(v_keys) > 0 THEN
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
        body := jsonb_build_object('keys', v_keys)
      );
    END IF;
  END IF;

  RETURN OLD;
END;
$$;
