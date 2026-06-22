/*
  # Fix infinite recursion in listings/listing_realtors RLS policies

  1. Problem
    - SELECT on `listings` triggers "Realtors can view assigned listings" policy
    - That policy queries `listing_realtors`
    - `listing_realtors` SELECT policies query back into `listings` (for ownership/status checks)
    - This creates an infinite recursion loop, blocking ALL listing queries

  2. Solution
    - Create SECURITY DEFINER helper functions in `private` schema that query `listings`
      directly (bypassing RLS since postgres has bypassrls privilege)
    - Replace subqueries on `listings` in `listing_realtors` policies with these helpers
    - This breaks the circular reference chain

  3. New Functions
    - `private.owns_listing(listing_id uuid)` — checks if auth.uid() is the photographer
    - `private.is_listing_active(listing_id uuid)` — checks if listing status = 'active'

  4. Modified Policies (listing_realtors table)
    - "Photographers can view own listing assignments"
    - "Photographers can update own listing assignments"
    - "Photographers can delete own listing assignments"
    - "Public can view active listing assignments"

  5. Security
    - Functions are SECURITY DEFINER owned by postgres (bypassrls=true)
    - No direct RLS policy evaluation triggered inside these functions
    - EXECUTE granted only to authenticated (and public for the active check)
*/

-- Helper: check if current user owns a listing (bypasses RLS)
CREATE OR REPLACE FUNCTION private.owns_listing(check_listing_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = check_listing_id AND photographer_id = auth.uid()
  );
$$;

-- Helper: check if a listing is active (bypasses RLS)
CREATE OR REPLACE FUNCTION private.is_listing_active(check_listing_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = check_listing_id AND status = 'active'
  );
$$;

-- Grant execute to the roles that need these
GRANT EXECUTE ON FUNCTION private.owns_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_listing_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_listing_active(uuid) TO anon;

-- Drop and recreate listing_realtors policies that reference listings

DROP POLICY IF EXISTS "Photographers can view own listing assignments" ON public.listing_realtors;
CREATE POLICY "Photographers can view own listing assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (private.owns_listing(listing_id));

DROP POLICY IF EXISTS "Photographers can update own listing assignments" ON public.listing_realtors;
CREATE POLICY "Photographers can update own listing assignments"
  ON public.listing_realtors FOR UPDATE
  TO authenticated
  USING (private.owns_listing(listing_id))
  WITH CHECK (private.owns_listing(listing_id));

DROP POLICY IF EXISTS "Photographers can delete own listing assignments" ON public.listing_realtors;
CREATE POLICY "Photographers can delete own listing assignments"
  ON public.listing_realtors FOR DELETE
  TO authenticated
  USING (private.owns_listing(listing_id));

DROP POLICY IF EXISTS "Public can view active listing assignments" ON public.listing_realtors;
CREATE POLICY "Public can view active listing assignments"
  ON public.listing_realtors FOR SELECT
  TO anon
  USING (private.is_listing_active(listing_id));
