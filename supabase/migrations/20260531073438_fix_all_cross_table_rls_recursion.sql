/*
  # Fix all cross-table RLS infinite recursion chains

  1. Problem
    - The `authenticated` role inherits from `anon` in Supabase, so anon-targeted
      policies on `realtors` also fire for authenticated users.
    - `listing_realtors` policy "Realtors can view own assignments" queries `realtors`
    - `realtors` policy "Public can view realtors on active listings" (anon) queries
      `listing_realtors` back, causing infinite recursion (error 42P17).
    - Similar cross-references exist between `listings`, `listing_realtors`, `realtors`,
      `media_assets`, and `listing_events`.

  2. Solution
    - Create SECURITY DEFINER helper functions in `private` schema that bypass RLS:
      - `private.is_assigned_realtor(listing_id)` - checks if current user is a realtor
        assigned to the given listing
      - `private.realtor_has_active_listing(realtor_id)` - checks if a realtor is
        assigned to any active listing
    - Replace all direct cross-table subqueries in RLS policies with these helpers.

  3. New Functions
    - `private.is_assigned_realtor(check_listing_id uuid)` - joins listing_realtors
      and realtors bypassing RLS to check if auth.uid() is an assigned realtor
    - `private.realtor_has_active_listing(check_realtor_id uuid)` - joins
      listing_realtors and listings bypassing RLS to check if realtor is on active listing
    - `private.is_assigned_realtor_with_permission(check_listing_id uuid, permission text)`
      - same as above but also checks a specific boolean permission column

  4. Modified Policies
    - `listing_realtors`: "Realtors can view own assignments"
    - `listings`: "Realtors can view assigned listings"
    - `realtors`: "Public can view realtors on active listings"
    - `media_assets`: "Realtors can view assigned listing media"
    - `listing_events`: "Realtors can view assigned listing events"

  5. Security
    - All helper functions are SECURITY DEFINER owned by postgres (bypassrls)
    - They perform minimal checks (ownership/membership) without exposing data
    - EXECUTE granted to authenticated and anon as needed
*/

-- Helper: check if current user is an assigned realtor for a listing
CREATE OR REPLACE FUNCTION private.is_assigned_realtor(check_listing_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_realtors lr
    JOIN public.realtors r ON r.id = lr.realtor_id
    WHERE lr.listing_id = check_listing_id
      AND r.auth_user_id = auth.uid()
  );
$$;

-- Helper: check if current user is assigned realtor with a specific permission
CREATE OR REPLACE FUNCTION private.is_assigned_realtor_with_permission(
  check_listing_id uuid,
  permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF permission = 'can_view_analytics' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.listing_realtors lr
      JOIN public.realtors r ON r.id = lr.realtor_id
      WHERE lr.listing_id = check_listing_id
        AND r.auth_user_id = auth.uid()
        AND lr.can_view_analytics = true
    );
  ELSIF permission = 'can_download' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.listing_realtors lr
      JOIN public.realtors r ON r.id = lr.realtor_id
      WHERE lr.listing_id = check_listing_id
        AND r.auth_user_id = auth.uid()
        AND lr.can_download = true
    );
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Helper: check if a realtor is assigned to any active listing
CREATE OR REPLACE FUNCTION private.realtor_has_active_listing(check_realtor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_realtors lr
    JOIN public.listings l ON l.id = lr.listing_id
    WHERE lr.realtor_id = check_realtor_id
      AND l.status = 'active'
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION private.is_assigned_realtor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_assigned_realtor_with_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.realtor_has_active_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.realtor_has_active_listing(uuid) TO anon;

-- Fix listing_realtors: "Realtors can view own assignments"
DROP POLICY IF EXISTS "Realtors can view own assignments" ON public.listing_realtors;
CREATE POLICY "Realtors can view own assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (private.is_assigned_realtor(listing_id));

-- Fix listings: "Realtors can view assigned listings"
DROP POLICY IF EXISTS "Realtors can view assigned listings" ON public.listings;
CREATE POLICY "Realtors can view assigned listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (private.is_assigned_realtor(id));

-- Fix realtors: "Public can view realtors on active listings"
DROP POLICY IF EXISTS "Public can view realtors on active listings" ON public.realtors;
CREATE POLICY "Public can view realtors on active listings"
  ON public.realtors FOR SELECT
  TO anon
  USING (private.realtor_has_active_listing(id));

-- Fix media_assets: "Realtors can view assigned listing media"
DROP POLICY IF EXISTS "Realtors can view assigned listing media" ON public.media_assets;
CREATE POLICY "Realtors can view assigned listing media"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (private.is_assigned_realtor(listing_id));

-- Fix listing_events: "Realtors can view assigned listing events"
DROP POLICY IF EXISTS "Realtors can view assigned listing events" ON public.listing_events;
CREATE POLICY "Realtors can view assigned listing events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (private.is_assigned_realtor_with_permission(listing_id, 'can_view_analytics'));
