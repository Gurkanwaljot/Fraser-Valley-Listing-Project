/*
  # Add Live Progress Tracking to Listing ZIPs

  This migration adds two columns to the `listing_zips` table that allow the
  edge function to report per-file download progress while a ZIP is being
  generated. The UI polls the row and displays a "Fetching file N of M" caption
  with a determinate progress bar.

  1. Modified Tables
    - `listing_zips`
      - Added `files_processed` (integer, default 0) -- counter incremented
        as each source file is fetched from R2 and added to the ZIP buffer
      - Added `files_total` (integer, default 0) -- total files queued for
        the current generation run, set when generation begins

  2. Behavior
    - Both columns are reset to 0 when generation completes successfully.
    - Both columns default to 0 so existing rows remain valid.
    - No RLS changes -- existing policies on `listing_zips` continue to apply.

  3. Notes
    - These columns are non-destructive: they default to 0 and are only used
      while a ZIP is in the `generating` state.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'files_processed'
  ) THEN
    ALTER TABLE listing_zips ADD COLUMN files_processed integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'files_total'
  ) THEN
    ALTER TABLE listing_zips ADD COLUMN files_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;
