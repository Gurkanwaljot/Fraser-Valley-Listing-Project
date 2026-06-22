/*
  # Add download status tracking to download_logs

  1. Modified Tables
    - `download_logs`
      - Added `status` (text, not null, default 'success') - tracks whether download succeeded, failed, or was partial
      - Added `failure_reason` (text, nullable) - stores error details when download fails

  2. Important Notes
    - Existing rows default to 'success' since they were only logged on successful downloads
    - Status values: 'success', 'failed', 'partial'
    - 'partial' means a ZIP was created but some files were skipped
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'download_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE download_logs ADD COLUMN status text NOT NULL DEFAULT 'success';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'download_logs' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE download_logs ADD COLUMN failure_reason text;
  END IF;
END $$;
