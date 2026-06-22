-- SQL RPCs for server-side analytics aggregation to avoid pulling raw rows to the browser.

-- 1. Views over time (grouped by day)
CREATE OR REPLACE FUNCTION public.analytics_views_over_time(
  p_listing_ids uuid[],
  p_date_start timestamptz DEFAULT NULL
)
RETURNS TABLE(day date, event_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    (e.created_at AT TIME ZONE 'UTC')::date AS day,
    count(*) AS event_count
  FROM public.listing_events e
  WHERE e.listing_id = ANY(p_listing_ids)
    AND e.event_type = 'view'
    AND (p_date_start IS NULL OR e.created_at >= p_date_start)
  GROUP BY day
  ORDER BY day;
$$;

-- 2. Device breakdown
CREATE OR REPLACE FUNCTION public.analytics_device_breakdown(
  p_listing_ids uuid[],
  p_date_start timestamptz DEFAULT NULL
)
RETURNS TABLE(device text, event_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    COALESCE(e.device_type, 'unknown') AS device,
    count(*) AS event_count
  FROM public.listing_events e
  WHERE e.listing_id = ANY(p_listing_ids)
    AND e.event_type = 'view'
    AND (p_date_start IS NULL OR e.created_at >= p_date_start)
  GROUP BY device
  ORDER BY event_count DESC;
$$;

-- 3. Top referrers
CREATE OR REPLACE FUNCTION public.analytics_top_referrers(
  p_listing_ids uuid[],
  p_date_start timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE(referrer_domain text, event_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    substring(e.referrer from '://([^/]+)') AS referrer_domain,
    count(*) AS event_count
  FROM public.listing_events e
  WHERE e.listing_id = ANY(p_listing_ids)
    AND e.event_type = 'view'
    AND e.referrer IS NOT NULL
    AND e.referrer <> ''
    AND (p_date_start IS NULL OR e.created_at >= p_date_start)
  GROUP BY referrer_domain
  HAVING substring(e.referrer from '://([^/]+)') IS NOT NULL
  ORDER BY event_count DESC
  LIMIT p_limit;
$$;

-- 4. Event type breakdown
CREATE OR REPLACE FUNCTION public.analytics_event_breakdown(
  p_listing_ids uuid[],
  p_date_start timestamptz DEFAULT NULL
)
RETURNS TABLE(event_type text, event_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    e.event_type,
    count(*) AS event_count
  FROM public.listing_events e
  WHERE e.listing_id = ANY(p_listing_ids)
    AND (p_date_start IS NULL OR e.created_at >= p_date_start)
  GROUP BY e.event_type
  ORDER BY event_count DESC;
$$;

-- 5. Conversion funnel counts
CREATE OR REPLACE FUNCTION public.analytics_conversion_funnel(
  p_listing_ids uuid[],
  p_date_start timestamptz DEFAULT NULL
)
RETURNS TABLE(event_type text, event_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    e.event_type,
    count(*) AS event_count
  FROM public.listing_events e
  WHERE e.listing_id = ANY(p_listing_ids)
    AND e.event_type IN ('view', 'photo_open', 'realtor_contact_click', 'lead_submit')
    AND (p_date_start IS NULL OR e.created_at >= p_date_start)
  GROUP BY e.event_type;
$$;