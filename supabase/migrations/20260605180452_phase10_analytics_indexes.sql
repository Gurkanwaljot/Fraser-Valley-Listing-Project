-- Phase 10: Enhanced Analytics & Tracking - Performance Indexes

-- Composite index for filtered dashboard queries (listing + event type + time range)
CREATE INDEX IF NOT EXISTS idx_listing_events_listing_type_created
  ON listing_events (listing_id, event_type, created_at);

-- Index for time-range scans across all listings
CREATE INDEX IF NOT EXISTS idx_listing_events_created_at
  ON listing_events (created_at);

-- Index for session-based aggregation (time on page, scroll depth grouping)
CREATE INDEX IF NOT EXISTS idx_listing_events_session_id
  ON listing_events (session_id);
