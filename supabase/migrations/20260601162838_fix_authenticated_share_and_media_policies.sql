/*
  # Fix authenticated user access to share tokens and public media

  1. Security Changes
    - Add SELECT policy on `listing_shares` for `authenticated` role to allow share token validation
    - Add SELECT policy on `media_assets` for `authenticated` role to allow viewing public media

  2. Important Notes
    - After OTP verification, users switch from `anon` to `authenticated` role
    - The existing "Anon can validate share tokens" policy only covers `anon` role
    - Without this fix, authenticated realtors cannot read their share tokens
    - The media policy allows any authenticated user to see public media (same as anon)
*/

CREATE POLICY "Authenticated can validate share tokens"
  ON listing_shares
  FOR SELECT
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'media_assets'
    AND policyname = 'Authenticated can view public media'
  ) THEN
    CREATE POLICY "Authenticated can view public media"
      ON media_assets
      FOR SELECT
      TO authenticated
      USING (is_public = true);
  END IF;
END $$;
