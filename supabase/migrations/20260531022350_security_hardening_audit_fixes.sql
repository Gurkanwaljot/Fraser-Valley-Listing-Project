/*
  # Security Hardening - Audit Fixes

  Addresses findings from the Supabase Security Advisor.

  1. Functions - Fixed search_path
    - `has_role()` - Added SET search_path = '' to prevent search path manipulation
    - `handle_new_user()` - Added SET search_path = '' to prevent search path manipulation
    - `update_updated_at()` - Added SET search_path = '' to prevent search path manipulation

  2. Functions - Revoked public EXECUTE
    - Revoked EXECUTE on `handle_new_user` from anon and authenticated (trigger-only function)
    - Revoked EXECUTE on `has_role` from anon (no legitimate use case for anonymous users)

  3. RLS - Tightened listing_events INSERT policy
    - Replaced unrestricted `WITH CHECK (true)` for authenticated users
    - Now requires the listing to be active (same check as the anon policy)

  4. Storage - Removed broad SELECT policy on headshots bucket
    - Public buckets serve files by direct URL without needing a SELECT policy
    - The broad policy allowed enumeration of all files in the bucket

  5. Important Notes
    - has_role() remains callable by authenticated role since RLS policies depend on it
    - handle_new_user() is only invoked by the on_auth_user_created trigger
    - No data loss or schema changes in this migration
*/

-- ============================================================
-- 1. Fix search_path on all SECURITY DEFINER functions
-- ============================================================

-- Recreate has_role with fixed search_path
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = check_role
  );
END;
$$;

-- Recreate handle_new_user with fixed search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

-- Recreate update_updated_at with fixed search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Revoke EXECUTE on SECURITY DEFINER functions
-- ============================================================

-- handle_new_user should only be called by the trigger, never directly via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- has_role should not be callable by anonymous users
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;

-- ============================================================
-- 3. Tighten listing_events INSERT policy for authenticated
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can insert listing events" ON public.listing_events;

-- Replace with a policy that requires the listing to be active
CREATE POLICY "Authenticated can insert listing events"
  ON public.listing_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_events.listing_id AND l.status = 'active'
    )
  );

-- ============================================================
-- 4. Remove broad SELECT policy on headshots storage bucket
-- ============================================================

-- Public buckets serve objects by direct URL without needing a SELECT policy.
-- The broad SELECT policy allowed enumeration of all files in the bucket.
DROP POLICY IF EXISTS "Public can view headshots" ON storage.objects;
