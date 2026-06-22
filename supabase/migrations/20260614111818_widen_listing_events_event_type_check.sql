-- Widen the event_type CHECK constraint to include all event types emitted by the app.
-- Previously only 8 types were allowed, causing page_leave, scroll_depth, and gallery_summary
-- events to be silently rejected (500 from track-event edge function).

ALTER TABLE public.listing_events DROP CONSTRAINT IF EXISTS listing_events_event_type_check;

ALTER TABLE public.listing_events ADD CONSTRAINT listing_events_event_type_check
  CHECK (event_type IN (
    -- Original types
    'view', 'photo_open', 'video_play', 'document_download',
    'realtor_contact_click', 'lead_submit', 'download_center_open', 'asset_download',
    -- Engagement (previously dropped by DB)
    'page_leave', 'scroll_depth', 'gallery_summary',
    -- Download/OTP funnel (Phase 3.2)
    'otp_requested', 'otp_verified', 'otp_failed', 'asset_download_complete',
    -- Marketing Kit tracking (Phase 3.1)
    'marketing_kit_open', 'brochure_open', 'brochure_export',
    'social_post_open', 'social_post_export', 'reel_open', 'reel_export',
    'realtor_portal_view'
  ));