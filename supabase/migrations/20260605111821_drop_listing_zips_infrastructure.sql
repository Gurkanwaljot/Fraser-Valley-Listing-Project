/*
# Drop listing_zips server-side zip generation infrastructure

The application now uses client-side streaming downloads exclusively.
The server-side zip pre-generation system is no longer needed and wastes
R2 storage + compute resources.

## Removed Infrastructure
1. pg_cron job: 'process-stale-listing-zips' (ran every 30 seconds)
2. Trigger: trg_media_assets_mark_zips_stale on media_assets
3. Trigger: trg_listings_address_mark_zips_stale on listings
4. Function: private.process_stale_listing_zips()
5. Function: private.mark_listing_zips_stale()
6. Function: private.mark_listing_zips_stale_on_address_change()
7. Trigger: trg_listing_zips_cleanup_storage on listing_zips
8. Function: private.cleanup_listing_zip_storage()
9. Table: listing_zips (CASCADE removes all RLS policies)

## What Remains (streaming download system)
- stream_download_tokens table
- stream_download_runs table
- prepare-stream-download edge function
- record-stream-run edge function
*/

-- 1. Unschedule the cron job
SELECT cron.unschedule('process-stale-listing-zips');

-- 2. Drop triggers on media_assets and listings
DROP TRIGGER IF EXISTS trg_media_assets_mark_zips_stale ON public.media_assets;
DROP TRIGGER IF EXISTS trg_listings_address_mark_zips_stale ON public.listings;

-- 3. Drop the cleanup trigger on listing_zips (before dropping the table)
DROP TRIGGER IF EXISTS trg_listing_zips_cleanup_storage ON public.listing_zips;

-- 4. Drop functions
DROP FUNCTION IF EXISTS private.process_stale_listing_zips();
DROP FUNCTION IF EXISTS private.mark_listing_zips_stale();
DROP FUNCTION IF EXISTS private.mark_listing_zips_stale_on_address_change();
DROP FUNCTION IF EXISTS private.cleanup_listing_zip_storage();

-- 5. Drop the listing_zips table (CASCADE removes policies)
DROP TABLE IF EXISTS public.listing_zips CASCADE;
