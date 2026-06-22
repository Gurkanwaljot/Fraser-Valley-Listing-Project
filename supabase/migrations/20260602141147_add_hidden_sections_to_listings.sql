/*
  # Add hidden_sections column to listings

  1. Modified Tables
    - `listings`
      - Added `hidden_sections` (text array, default includes 'documents')
        Controls which sections are hidden on the public listing page.
        Photographers and admins can toggle section visibility.

  2. Important Notes
    - Default value is ARRAY['documents'] so documents are hidden by default on public listings
    - Sections with no content are already hidden automatically; this column allows
      manually hiding sections that DO have content
    - Existing listings will get 'documents' hidden by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'hidden_sections'
  ) THEN
    ALTER TABLE public.listings
      ADD COLUMN hidden_sections text[] DEFAULT ARRAY['documents']::text[];
  END IF;
END $$;
