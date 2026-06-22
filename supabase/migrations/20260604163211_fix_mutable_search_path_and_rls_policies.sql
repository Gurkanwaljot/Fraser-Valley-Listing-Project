/*
  # Security hardening: fix mutable search_path and exposed functions

  1. Function Fixes
    - Add `SET search_path = ''` to `private.mark_listing_zips_stale`
    - Add `SET search_path = ''` to `private.mark_listing_zips_stale_on_address_change`
    - Add `SET search_path = ''` to `private.cleanup_listing_zip_storage`
    - Add `SET search_path = ''` to `private.process_stale_listing_zips`
    - Add `SET search_path = ''` to `public.increment_zip_retry`
    - Revoke EXECUTE on `public.increment_zip_retry` from `anon` and `authenticated`
      (only service_role should call this via edge functions)

  2. RLS Policy Additions
    - Add explicit restrictive SELECT policy on `otp_codes` for `authenticated`
    - Add explicit restrictive SELECT policy on `stream_download_runs` for `authenticated`
    - Add explicit restrictive SELECT policy on `stream_download_tokens` for `authenticated`
    These tables are service-role-only; the policies explicitly deny all client access.

  3. Important Notes
    - All five functions retain SECURITY DEFINER but now have immutable search_path
    - `increment_zip_retry` remains in public schema for PostgREST accessibility
      by service_role, but anon/authenticated cannot call it
    - The three RLS policies use `USING (false)` to make the deny-all intent explicit
*/

-- 1. Fix search_path on private.mark_listing_zips_stale
ALTER FUNCTION private.mark_listing_zips_stale()
  SET search_path = '';

-- 2. Fix search_path on private.mark_listing_zips_stale_on_address_change
ALTER FUNCTION private.mark_listing_zips_stale_on_address_change()
  SET search_path = '';

-- 3. Fix search_path on private.cleanup_listing_zip_storage
ALTER FUNCTION private.cleanup_listing_zip_storage()
  SET search_path = '';

-- 4. Fix search_path on private.process_stale_listing_zips
ALTER FUNCTION private.process_stale_listing_zips()
  SET search_path = '';

-- 5. Fix search_path on public.increment_zip_retry and revoke public access
ALTER FUNCTION public.increment_zip_retry(uuid, text, text)
  SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.increment_zip_retry(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_zip_retry(uuid, text, text) FROM authenticated;

-- 6. Add explicit deny policies for service-role-only tables

-- otp_codes: only edge functions (service_role) should read/write
CREATE POLICY "Deny all client access"
  ON public.otp_codes
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all anon access"
  ON public.otp_codes
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- stream_download_runs: only edge functions (service_role) should read/write
CREATE POLICY "Deny all client access"
  ON public.stream_download_runs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all anon access"
  ON public.stream_download_runs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- stream_download_tokens: only edge functions (service_role) should read/write
CREATE POLICY "Deny all client access"
  ON public.stream_download_tokens
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all anon access"
  ON public.stream_download_tokens
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
