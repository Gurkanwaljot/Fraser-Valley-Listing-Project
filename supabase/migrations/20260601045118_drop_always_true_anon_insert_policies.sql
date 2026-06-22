/*
  # Remove Insecure Always-True Anon INSERT Policies

  1. Security Changes
    - Drop `"Anon users can insert download logs"` on `download_logs`
      - This policy had WITH CHECK (true), allowing unrestricted anon inserts
      - All download log inserts happen after OTP verification (user is authenticated)
      - The existing authenticated INSERT policies cover the real use case
      - FK constraint on listing_id prevents invalid references at DB level
    - Drop `"Anon can insert listing events"` on `listing_events`
      - This policy had WITH CHECK (true), allowing unrestricted anon inserts
      - The existing policy "Anyone can insert listing events" (also for anon role)
        already validates that the referenced listing exists and is active
      - No replacement needed; the restrictive policy already handles legitimate anon inserts

  2. Notes
    - No new policies are added; proper restrictive policies already exist
    - No cross-table recursion risk: the listings anon SELECT policy is a simple column check
    - otp_codes table is left as-is (RLS enabled, no policies = zero client access by design)
*/

DROP POLICY IF EXISTS "Anon users can insert download logs" ON public.download_logs;

DROP POLICY IF EXISTS "Anon can insert listing events" ON public.listing_events;
