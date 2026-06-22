/*
  # Add Floor Plans, Section Ordering, and Interactive Floor Plan Embed

  1. Modified Tables
    - `listings`
      - `section_order` (text[], nullable) - Custom ordering of sections on the public listing page
      - `interactive_floor_plan_embed` (text, nullable) - URL or embed code for interactive floor plan (e.g. Matterport, iGuide)
    - `media_assets`
      - Expand `kind` constraint to include 'floor_plan' value

  2. Changes
    - Alter check constraint on media_assets.kind to allow 'floor_plan'
    - Add two new columns to listings table

  3. Important Notes
    - section_order stores section IDs in display order (e.g. ['photos','video','floor_plan','details','map','documents','contact'])
    - interactive_floor_plan_embed stores a URL or full iframe embed code
    - floor_plan media kind allows dedicated floor plan images separate from regular photos
*/

-- Add section_order column to listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'section_order'
  ) THEN
    ALTER TABLE listings ADD COLUMN section_order text[] DEFAULT NULL;
  END IF;
END $$;

-- Add interactive_floor_plan_embed column to listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'interactive_floor_plan_embed'
  ) THEN
    ALTER TABLE listings ADD COLUMN interactive_floor_plan_embed text DEFAULT NULL;
  END IF;
END $$;

-- Update media_assets kind constraint to include 'floor_plan'
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'media_assets' AND column_name = 'kind'
  ) THEN
    ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_kind_check;
  END IF;

  -- Add updated constraint
  ALTER TABLE media_assets ADD CONSTRAINT media_assets_kind_check
    CHECK (kind IN ('photo', 'video', 'document', 'floor_plan'));
END $$;
