/*
  # Add Phase Tracking to ZIP Generation

  This migration adds a `progress_phase` column to `listing_zips` so the
  generation process can distinguish three distinct stages of work and the
  UI can render an honest status caption.

  1. Modified Tables
    - `listing_zips`
      - Added `progress_phase` (text, nullable) -- one of:
        - `fetching` -- downloading source files from storage
        - `bundling` -- compressing files into a single ZIP buffer
        - `uploading` -- uploading the finished ZIP to R2
        - NULL when the row is not actively generating

  2. Recovery
    - Resets any rows that are currently stuck in `generating` state
      with a `generation_started_at` older than 10 minutes. These rows
      are marked `failed` so the user can retrigger generation cleanly.

  3. Notes
    - No RLS changes required.
    - No data is destroyed -- the recovery step only updates status fields.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_zips' AND column_name = 'progress_phase'
  ) THEN
    ALTER TABLE listing_zips ADD COLUMN progress_phase text;
  END IF;
END $$;

UPDATE listing_zips
SET
  status = 'failed',
  error_message = COALESCE(error_message, 'Recovered from stuck generation state'),
  files_processed = 0,
  files_total = 0,
  progress_phase = NULL
WHERE status = 'generating'
  AND generation_started_at IS NOT NULL
  AND generation_started_at < (now() - interval '10 minutes');
