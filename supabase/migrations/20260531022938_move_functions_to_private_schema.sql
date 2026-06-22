/*
  # Move SECURITY DEFINER functions to private schema

  Fixes all four security audit warnings about public/authenticated executing
  SECURITY DEFINER functions via PostgREST /rest/v1/rpc/ endpoints.

  1. Approach
    - Create a `private` schema not exposed via PostgREST API
    - Recreate `has_role()` and `handle_new_user()` in `private` schema
    - Update all 19 RLS policies that reference `has_role()` to use `private.has_role()`
    - Recreate the auth trigger to use `private.handle_new_user()`
    - Drop the old public schema functions
    - Revoke default PUBLIC execute grants

  2. Affected Tables (RLS policy updates)
    - profiles, user_roles, realtors, listings, listing_realtors,
      listing_shares, listing_events, media_assets, download_logs, leads, audit_logs

  3. Security Result
    - Functions no longer accessible via /rest/v1/rpc/ (private schema not in API)
    - RLS policies still work (authenticated granted EXECUTE on private schema functions)
    - Trigger still fires on user signup

  4. Important Notes
    - No data changes or schema modifications to tables
    - All existing RLS logic preserved exactly as-is
    - `update_updated_at()` also moved to private schema for consistency
*/

-- ============================================================
-- Step 1: Create private schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- Step 2: Create functions in private schema
-- ============================================================

CREATE OR REPLACE FUNCTION private.has_role(check_user_id uuid, check_role text)
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

CREATE OR REPLACE FUNCTION private.handle_new_user()
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

CREATE OR REPLACE FUNCTION private.update_updated_at()
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
-- Step 3: Grant EXECUTE only to roles that need it
-- ============================================================

-- has_role: needed by authenticated for RLS policy evaluation
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, text) TO authenticated;

-- handle_new_user: only the trigger needs it (runs as supabase_admin/postgres)
-- No grants needed for anon or authenticated

-- update_updated_at: only used by triggers
-- No grants needed for anon or authenticated

-- ============================================================
-- Step 4: Update trigger to use private schema function
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Update all updated_at triggers to use private schema
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_realtors_updated_at ON public.realtors;
CREATE TRIGGER set_realtors_updated_at
  BEFORE UPDATE ON public.realtors
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_listings_updated_at ON public.listings;
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_listing_realtors_updated_at ON public.listing_realtors;
CREATE TRIGGER set_listing_realtors_updated_at
  BEFORE UPDATE ON public.listing_realtors
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER set_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_listing_shares_updated_at ON public.listing_shares;
CREATE TRIGGER set_listing_shares_updated_at
  BEFORE UPDATE ON public.listing_shares
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

-- ============================================================
-- Step 5: Drop and recreate all RLS policies using private.has_role()
-- ============================================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- USER_ROLES ---
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- REALTORS ---
DROP POLICY IF EXISTS "Admins can view all realtors" ON public.realtors;
CREATE POLICY "Admins can view all realtors"
  ON public.realtors FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any realtor" ON public.realtors;
CREATE POLICY "Admins can update any realtor"
  ON public.realtors FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete realtors" ON public.realtors;
CREATE POLICY "Admins can delete realtors"
  ON public.realtors FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Photographers can create realtors" ON public.realtors;
CREATE POLICY "Photographers can create realtors"
  ON public.realtors FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (private.has_role(auth.uid(), 'photographer') OR private.has_role(auth.uid(), 'admin'))
  );

-- --- LISTINGS ---
DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any listing" ON public.listings;
CREATE POLICY "Admins can update any listing"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any listing" ON public.listings;
CREATE POLICY "Admins can delete any listing"
  ON public.listings FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Photographers can create listings" ON public.listings;
CREATE POLICY "Photographers can create listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    photographer_id = auth.uid()
    AND (private.has_role(auth.uid(), 'photographer') OR private.has_role(auth.uid(), 'admin'))
  );

-- --- LISTING_REALTORS ---
DROP POLICY IF EXISTS "Admins can view all listing realtor assignments" ON public.listing_realtors;
CREATE POLICY "Admins can view all listing realtor assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- LISTING_SHARES ---
DROP POLICY IF EXISTS "Admins can view all shares" ON public.listing_shares;
CREATE POLICY "Admins can view all shares"
  ON public.listing_shares FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- LISTING_EVENTS ---
DROP POLICY IF EXISTS "Admins can view all events" ON public.listing_events;
CREATE POLICY "Admins can view all events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- MEDIA_ASSETS ---
DROP POLICY IF EXISTS "Admins can view all media" ON public.media_assets;
CREATE POLICY "Admins can view all media"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- DOWNLOAD_LOGS ---
DROP POLICY IF EXISTS "Admins can view all download logs" ON public.download_logs;
CREATE POLICY "Admins can view all download logs"
  ON public.download_logs FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- LEADS ---
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- --- AUDIT_LOGS ---
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Step 6: Remove old public schema functions
-- ============================================================

-- Revoke all permissions first (including PUBLIC pseudo-role)
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM authenticated;

-- Drop the old functions from public schema
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();
