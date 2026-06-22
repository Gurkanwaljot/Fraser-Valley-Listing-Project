/*
  # Add brokerage_logo_url to realtors

  Adds a single nullable text column to store the realtor's brokerage logo URL.
  Mirrors the existing headshot_url pattern.
*/

ALTER TABLE public.realtors
  ADD COLUMN IF NOT EXISTS brokerage_logo_url text;
