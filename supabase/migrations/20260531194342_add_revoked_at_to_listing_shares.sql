/*
  # Add revocation support to listing_shares

  1. Modified Tables
    - `listing_shares`
      - `revoked_at` (timestamptz, nullable) - When set, the share link is immediately invalid
      - Index on `revoked_at` for efficient filtering of active shares

  2. Security
    - Existing RLS policies remain in effect
    - Revocation check: share is invalid if `revoked_at IS NOT NULL` or `expires_at < now()`

  3. Notes
    - Photographers can revoke shares at any time
    - Revoked shares show the same "expired" message to realtors
    - NULL revoked_at means the share is still active (subject to expires_at check)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_shares' AND column_name = 'revoked_at'
  ) THEN
    ALTER TABLE public.listing_shares ADD COLUMN revoked_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listing_shares_revoked_at ON public.listing_shares(revoked_at);
