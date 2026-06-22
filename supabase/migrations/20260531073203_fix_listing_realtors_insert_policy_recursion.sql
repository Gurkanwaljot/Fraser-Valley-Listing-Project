/*
  # Fix listing_realtors INSERT policy infinite recursion

  1. Problem
    - The "Photographers can create listing assignments" INSERT policy on
      `listing_realtors` queries `listings` directly to verify ownership.
    - This triggers RLS evaluation on `listings`, which has a policy that
      queries `listing_realtors`, causing infinite recursion (error 42P17).

  2. Solution
    - Replace the direct `listings` subquery with the existing
      `private.owns_listing()` SECURITY DEFINER helper function.
    - This bypasses RLS on listings, breaking the circular chain.

  3. Modified Policies
    - `listing_realtors`: "Photographers can create listing assignments"
      - Old: EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND photographer_id = auth.uid())
      - New: private.owns_listing(listing_id) AND assigned_by = auth.uid()
*/

DROP POLICY IF EXISTS "Photographers can create listing assignments" ON public.listing_realtors;
CREATE POLICY "Photographers can create listing assignments"
  ON public.listing_realtors FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND private.owns_listing(listing_id)
  );
