/*
  # Stream download telemetry and expected size

  Adds observability for the new edge-streamed ZIP downloads so we can
  detect truncation, measure throughput, and confirm reliability fixes
  in production.

  1. Modified Tables
    - `stream_download_tokens`
      - `expected_bytes` (bigint, default 0): pre-calculated total bytes
        for the asset set this token authorizes. Lets the client warn if
        the actual download is far smaller than expected.
      - `expected_file_count` (integer, default 0): expected number of
        files in the streamed ZIP.

  2. New Tables
    - `stream_download_runs`
      - `id` (uuid, primary key)
      - `token` (text, unique): one row per stream attempt, keyed by the
        single-use token.
      - `listing_id` (uuid, fk to listings on cascade)
      - `kind` (text): photo/video/document/floor_plan/all
      - `level` (smallint): compression level (0 or 1)
      - `expected_bytes` (bigint, default 0)
      - `expected_file_count` (integer, default 0)
      - `bytes_delivered` (bigint, default 0)
      - `files_delivered` (integer, default 0)
      - `duration_ms` (integer, default 0)
      - `terminal_status` (text): one of 'success', 'error',
        'cancelled', 'in_progress'.
      - `error_message` (text, nullable)
      - `started_at` (timestamptz, default now())
      - `finished_at` (timestamptz, nullable)

  3. Security
    - RLS enabled on `stream_download_runs` with no client-facing policy.
      Only the service role (edge functions) reads or writes these rows.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stream_download_tokens' AND column_name = 'expected_bytes'
  ) THEN
    ALTER TABLE stream_download_tokens
      ADD COLUMN expected_bytes bigint NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stream_download_tokens' AND column_name = 'expected_file_count'
  ) THEN
    ALTER TABLE stream_download_tokens
      ADD COLUMN expected_file_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stream_download_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  kind text NOT NULL,
  level smallint NOT NULL DEFAULT 0,
  expected_bytes bigint NOT NULL DEFAULT 0,
  expected_file_count integer NOT NULL DEFAULT 0,
  bytes_delivered bigint NOT NULL DEFAULT 0,
  files_delivered integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  terminal_status text NOT NULL DEFAULT 'in_progress',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE stream_download_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stream_download_runs_listing_idx
  ON stream_download_runs (listing_id, started_at DESC);

CREATE INDEX IF NOT EXISTS stream_download_runs_status_idx
  ON stream_download_runs (terminal_status, started_at DESC);
