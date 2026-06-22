/*
  # Create OTP Codes Table

  1. New Tables
    - `otp_codes`
      - `id` (uuid, primary key) - Unique identifier for each OTP entry
      - `email` (text, not null) - Email address the code was sent to
      - `code` (text, not null) - The 6-digit verification code
      - `expires_at` (timestamptz, not null) - When this code expires
      - `verified_at` (timestamptz, nullable) - When this code was successfully verified
      - `created_at` (timestamptz, default now()) - When this code was generated

  2. Indexes
    - Composite index on (email, code, expires_at) for fast verification lookups
    - Index on expires_at for cleanup operations

  3. Security
    - RLS enabled (table accessed only by Edge Functions via service role key)
    - No public-facing policies needed

  4. Notes
    - This table supports a custom OTP email verification flow
    - Codes expire after 10 minutes
    - Only the most recent unverified code per email is valid (older ones are deleted on new send)
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_otp_codes_lookup
  ON otp_codes (email, code, expires_at);

CREATE INDEX IF NOT EXISTS idx_otp_codes_expires
  ON otp_codes (expires_at);
