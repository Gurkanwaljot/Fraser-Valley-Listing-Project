-- Add large_url column for optimized lightbox/hero images (1600px WebP)
ALTER TABLE media_assets ADD COLUMN large_url text;

COMMENT ON COLUMN media_assets.large_url IS 'URL for the 1600px max-width WebP variant used in lightbox and hero display';
