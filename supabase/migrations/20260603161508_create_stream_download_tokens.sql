/*
  # Create stream_download_tokens table

  Short-lived single-use tokens that authorize a browser GET to the
  stream-listing-zip edge function. The browser navigates directly to the
  streaming URL (which cannot carry an Authorization header), so we issue a
  random token via an authenticated POST to prepare-stream-download, store
  the binding in this table, and require the streaming function to look up
  and consume the token via the service role.

  1. New Tables
    - `stream_download_tokens`
      - `token` (text, primary key) — random URL-safe identifier
      - `user_id` (uuid) — the authenticated user who minted the token
      - `listing_id` (uuid) — listing the token is bound to
      - `kind` (text) — 'photo' | 'video' | 'document' | 'floor_plan' | 'all'
      - `level` (smallint) — fflate compression level (0 or 1)
      - `realtor_id` (uuid, nullable) — when minted from the Download Center
      - `expires_at` (timestamptz) — TTL, typically now() + 5 min
      - `used_at` (timestamptz, nullable) — set on first redemption
      - `created_at` (timestamptz, default now())
  2. Indexes
    - Index on `expires_at` for periodic cleanup
  3. Security
    - RLS enabled
    - No client policies — only the service role (used by both edge functions)
      reads/writes this table. The prepare function authenticates the user
      itself before inserting; the stream function consumes by token.
*/

CREATE TABLE IF NOT EXISTS stream_download_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video','document','floor_plan','all')),
  level smallint NOT NULL DEFAULT 0 CHECK (level IN (0,1)),
  realtor_id uuid REFERENCES realtors(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stream_download_tokens_expires_at_idx
  ON stream_download_tokens (expires_at);

ALTER TABLE stream_download_tokens ENABLE ROW LEVEL SECURITY;
