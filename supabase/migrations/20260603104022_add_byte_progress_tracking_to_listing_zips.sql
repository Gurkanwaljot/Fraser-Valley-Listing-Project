/*
  # Add Byte-Level Progress Tracking to listing_zips

  This migration adds three columns so the worker can publish byte-level
  progress for the dominant cost in video bundles -- the actual download
  from R2 and the upload back to R2. Without this, large files leave the
  UI sitting on "Creating ZIP..." for many minutes with no movement.

  ## New Columns
  1. `bytes_processed` (bigint, default 0)
       Bytes completed in the current phase (fetch chunk count or upload
       part progress). Reset to 0 when the phase changes or generation
       completes.
  2. `bytes_total` (bigint, default 0)
       Total bytes for the current phase (the size of the file being
       fetched, or the size of the assembled ZIP being uploaded). The UI
       treats `bytes_total = 0` as "no byte progress available -- fall
       back to file count" so light files don't need byte tracking.
  3. `current_file_name` (text, nullable)
       The original filename of the heavy file currently being fetched
       (e.g. "main-tour.mp4"). Lets the UI show "Fetching main-tour.mp4:
       640 MB / 1.6 GB (40%)". Null whenever no specific file is the
       focus (during bundling, uploading, or while light files run).

  ## Security
  No RLS changes. The existing policies on `listing_zips` already cover
  these columns since they are added to a table that has RLS enabled.

  ## Notes
  - All three columns are nullable / default-zero, so existing rows are
    unaffected and the worker can no-op them when not in heavy mode.
  - No DROPs, no destructive changes.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'bytes_processed'
  ) THEN
    ALTER TABLE public.listing_zips ADD COLUMN bytes_processed bigint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'bytes_total'
  ) THEN
    ALTER TABLE public.listing_zips ADD COLUMN bytes_total bigint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'current_file_name'
  ) THEN
    ALTER TABLE public.listing_zips ADD COLUMN current_file_name text;
  END IF;
END $$;
