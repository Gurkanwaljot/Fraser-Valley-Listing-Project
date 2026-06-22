/*
  # Fix remaining cross-table RLS policies that query listings directly

  1. Problem
    - The "Public can view realtors on active listings" policy on `realtors` joins
      `listing_realtors` and `listings` directly. Now that `listing_realtors` uses
      helper functions, this query path is safe, but the direct `listings` reference
      could still trigger RLS evaluation on listings from the anon role.
    - Other policies on download_logs, leads, listing_events, media_assets also query
      listings directly. While not currently causing recursion, they trigger full RLS
      evaluation on listings for every row check (performance issue).

  2. Solution
    - Replace direct `listings` subqueries in these policies with the existing
      `private.owns_listing()` and `private.is_listing_active()` helper functions.
    - These bypass RLS (SECURITY DEFINER, postgres owner with bypassrls) for a
      clean, performant check.

  3. Modified Policies
    - `realtors`: "Public can view realtors on active listings"
    - `media_assets`: "Public can view public media on active listings"
    - `download_logs`: "Photographers can view own listing downloads"
    - `leads`: "Photographers can view own listing leads"
    - `leads`: "Photographers can update own listing leads"
    - `listing_events`: "Photographers can view own listing events"
*/

-- realtors: Public can view realtors on active listings
-- This one joins listing_realtors and listings - replace with helper
DROP POLICY IF EXISTS "Public can view realtors on active listings" ON public.realtors;
CREATE POLICY "Public can view realtors on active listings"
  ON public.realtors FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_realtors lr
      WHERE lr.realtor_id = realtors.id
        AND private.is_listing_active(lr.listing_id)
    )
  );

-- media_assets: Public can view public media on active listings
DROP POLICY IF EXISTS "Public can view public media on active listings" ON public.media_assets;
CREATE POLICY "Public can view public media on active listings"
  ON public.media_assets FOR SELECT
  TO anon
  USING (is_public = true AND private.is_listing_active(listing_id));

-- download_logs: Photographers can view own listing downloads
DROP POLICY IF EXISTS "Photographers can view own listing downloads" ON public.download_logs;
CREATE POLICY "Photographers can view own listing downloads"
  ON public.download_logs FOR SELECT
  TO authenticated
  USING (private.owns_listing(listing_id));

-- leads: Photographers can view own listing leads
DROP POLICY IF EXISTS "Photographers can view own listing leads" ON public.leads;
CREATE POLICY "Photographers can view own listing leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (private.owns_listing(listing_id));

-- leads: Photographers can update own listing leads
DROP POLICY IF EXISTS "Photographers can update own listing leads" ON public.leads;
CREATE POLICY "Photographers can update own listing leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (private.owns_listing(listing_id))
  WITH CHECK (private.owns_listing(listing_id));

-- listing_events: Photographers can view own listing events
DROP POLICY IF EXISTS "Photographers can view own listing events" ON public.listing_events;
CREATE POLICY "Photographers can view own listing events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (private.owns_listing(listing_id));
