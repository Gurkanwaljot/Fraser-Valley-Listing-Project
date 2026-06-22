import { supabase } from '../lib/supabase';
import type { EventType } from '../types/database';

export type DateRange = '7d' | '30d' | '90d' | 'all';

function getDateStart(range: DateRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export interface OverviewMetrics {
  totalViews: number;
  totalPhotoOpens: number;
  totalVideoPlays: number;
  totalDownloads: number;
  totalLeads: number;
  uniqueVisitors: number;
  bounceRate: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface TopListing {
  listing_id: string;
  title: string;
  address: string;
  count: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
}

export interface ReferrerEntry {
  referrer: string;
  count: number;
}

export interface EventBreakdown {
  event_type: EventType;
  count: number;
}

export async function getOverviewMetrics(
  listingIds: string[],
  range: DateRange
): Promise<OverviewMetrics> {
  if (listingIds.length === 0) {
    return { totalViews: 0, totalPhotoOpens: 0, totalVideoPlays: 0, totalDownloads: 0, totalLeads: 0, uniqueVisitors: 0, bounceRate: 0 };
  }

  const dateStart = getDateStart(range);
  const eventTypes: EventType[] = ['view', 'photo_open', 'video_play', 'lead_submit'];

  const eventPromises = eventTypes.map((type) => {
    let query = supabase
      .from('listing_events')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .eq('event_type', type);
    if (dateStart) query = query.gte('created_at', dateStart);
    return query;
  });

  let downloadQuery = supabase
    .from('download_logs')
    .select('id', { count: 'exact', head: true })
    .in('listing_id', listingIds)
    .eq('status', 'success');
  if (dateStart) downloadQuery = downloadQuery.gte('created_at', dateStart);

  let sessionsQuery = supabase
    .from('listing_events')
    .select('session_id, event_type')
    .in('listing_id', listingIds)
    .not('session_id', 'is', null);
  if (dateStart) sessionsQuery = sessionsQuery.gte('created_at', dateStart);

  const [eventResults, downloadResult, sessionsResult] = await Promise.all([
    Promise.all(eventPromises),
    downloadQuery,
    sessionsQuery,
  ]);

  const sessionRows = (sessionsResult.data ?? []) as { session_id: string; event_type: string }[];
  const sessionEvents = new Map<string, Set<string>>();
  for (const row of sessionRows) {
    if (!row.session_id) continue;
    const set = sessionEvents.get(row.session_id) || new Set();
    set.add(row.event_type);
    sessionEvents.set(row.session_id, set);
  }
  const uniqueVisitors = sessionEvents.size;
  const bounceSessions = Array.from(sessionEvents.values()).filter(
    (evts) => evts.size === 1 && evts.has('view')
  ).length;
  const bounceRate = uniqueVisitors > 0 ? Math.round((bounceSessions / uniqueVisitors) * 100) : 0;

  return {
    totalViews: eventResults[0].count ?? 0,
    totalPhotoOpens: eventResults[1].count ?? 0,
    totalVideoPlays: eventResults[2].count ?? 0,
    totalDownloads: downloadResult.count ?? 0,
    totalLeads: eventResults[3].count ?? 0,
    uniqueVisitors,
    bounceRate,
  };
}

export async function getViewsOverTime(
  listingIds: string[],
  range: DateRange
): Promise<DailyCount[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('created_at')
    .in('listing_id', listingIds)
    .eq('event_type', 'view')
    .order('created_at', { ascending: true });

  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const date = (row as { created_at: string }).created_at.slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

export async function getTopListings(
  listingIds: string[],
  range: DateRange,
  limit = 10
): Promise<TopListing[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('listing_id')
    .in('listing_id', listingIds)
    .eq('event_type', 'view');

  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const id = (row as { listing_id: string }).listing_id;
    counts[id] = (counts[id] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  const topIds = sorted.map(([id]) => id);
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, address_line_1, city')
    .in('id', topIds);

  const listingMap = new Map((listings ?? []).map((l) => [
    (l as { id: string }).id,
    l as { id: string; title: string; address_line_1: string; city: string },
  ]));

  return sorted.map(([id, count]) => {
    const l = listingMap.get(id);
    return {
      listing_id: id,
      title: l?.title ?? '',
      address: l ? `${l.address_line_1}, ${l.city}` : '',
      count,
    };
  });
}

export async function getDeviceBreakdown(
  listingIds: string[],
  range: DateRange
): Promise<DeviceBreakdown[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('device_type')
    .in('listing_id', listingIds)
    .eq('event_type', 'view');

  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const device = (row as { device_type: string | null }).device_type || 'unknown';
    counts[device] = (counts[device] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([device_type, count]) => ({ device_type, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getReferrers(
  listingIds: string[],
  range: DateRange,
  limit = 10
): Promise<ReferrerEntry[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('referrer')
    .in('listing_id', listingIds)
    .eq('event_type', 'view')
    .not('referrer', 'is', null);

  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  const rows = (data ?? []) as unknown as { referrer: string }[];
  if (rows.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const ref = row.referrer;
    if (!ref) continue;
    let domain: string;
    try {
      domain = new URL(ref).hostname;
    } catch {
      domain = ref;
    }
    counts[domain] = (counts[domain] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getEventBreakdown(
  listingIds: string[],
  range: DateRange
): Promise<EventBreakdown[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('event_type')
    .in('listing_id', listingIds);

  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const type = (row as { event_type: string }).event_type;
    counts[type] = (counts[type] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([event_type, count]) => ({ event_type: event_type as EventType, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getListingAnalytics(
  listingId: string,
  range: DateRange
): Promise<{
  metrics: OverviewMetrics;
  viewsOverTime: DailyCount[];
  devices: DeviceBreakdown[];
  referrers: ReferrerEntry[];
  uniqueSessions: number;
}> {
  const [metrics, viewsOverTime, devices, referrers, uniqueSessions] = await Promise.all([
    getOverviewMetrics([listingId], range),
    getViewsOverTime([listingId], range),
    getDeviceBreakdown([listingId], range),
    getReferrers([listingId], range),
    (async () => {
      const dateStart = getDateStart(range);
      let query = supabase
        .from('listing_events')
        .select('session_id')
        .eq('listing_id', listingId)
        .eq('event_type', 'view')
        .not('session_id', 'is', null);
      if (dateStart) query = query.gte('created_at', dateStart);
      const { data } = await query;
      const rows = (data ?? []) as unknown as { session_id: string }[];
      const unique = new Set(rows.map((r) => r.session_id));
      return unique.size;
    })(),
  ]);

  return { metrics, viewsOverTime, devices, referrers, uniqueSessions };
}

export interface ScrollDepthData {
  depth: number;
  sessions: number;
}

export interface TopPhotoEntry {
  asset_id: string;
  count: number;
}

export interface GeoBreakdownEntry {
  location: string;
  count: number;
}

export interface EngagementMetrics {
  avgPageDuration: number | null;
  avgScrollDepth: number | null;
  galleryEngagementRate: number | null;
}

export async function getEngagementMetrics(listingId: string, range: DateRange): Promise<EngagementMetrics> {
  const dateStart = getDateStart(range);

  const buildQuery = (eventType: string) => {
    let q = supabase
      .from('listing_events')
      .select('metadata')
      .eq('listing_id', listingId)
      .eq('event_type', eventType);
    if (dateStart) q = q.gte('created_at', dateStart);
    return q;
  };

  const [pageLeaveResult, scrollResult, galleryResult] = await Promise.all([
    buildQuery('page_leave'),
    buildQuery('scroll_depth'),
    buildQuery('gallery_summary'),
  ]);

  let avgPageDuration: number | null = null;
  const pageLeaveRows = (pageLeaveResult.data ?? []) as { metadata: { duration_seconds?: number } }[];
  if (pageLeaveRows.length > 0) {
    const durations = pageLeaveRows
      .map((r) => r.metadata?.duration_seconds)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    if (durations.length > 0) {
      avgPageDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  let avgScrollDepth: number | null = null;
  const scrollRows = (scrollResult.data ?? []) as { metadata: { depth?: number } }[];
  if (scrollRows.length > 0) {
    const depths = scrollRows
      .map((r) => r.metadata?.depth)
      .filter((d): d is number => typeof d === 'number');
    if (depths.length > 0) {
      avgScrollDepth = Math.round(depths.reduce((a, b) => a + b, 0) / depths.length);
    }
  }

  let galleryEngagementRate: number | null = null;
  const galleryRows = (galleryResult.data ?? []) as { metadata: { engagement_rate?: number } }[];
  if (galleryRows.length > 0) {
    const rates = galleryRows
      .map((r) => r.metadata?.engagement_rate)
      .filter((r): r is number => typeof r === 'number');
    if (rates.length > 0) {
      galleryEngagementRate = Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100);
    }
  }

  return { avgPageDuration, avgScrollDepth, galleryEngagementRate };
}

export async function getScrollDepthDistribution(listingId: string, range: DateRange): Promise<ScrollDepthData[]> {
  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('session_id, metadata')
    .eq('listing_id', listingId)
    .eq('event_type', 'scroll_depth');
  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const sessionMaxDepth = new Map<string, number>();
  for (const row of data as { session_id: string; metadata: { depth?: number } }[]) {
    const depth = row.metadata?.depth ?? 0;
    const current = sessionMaxDepth.get(row.session_id) ?? 0;
    if (depth > current) sessionMaxDepth.set(row.session_id, depth);
  }

  const totalSessions = sessionMaxDepth.size;
  const milestones = [25, 50, 75, 100];
  return milestones.map((depth) => {
    const sessions = Array.from(sessionMaxDepth.values()).filter((d) => d >= depth).length;
    return { depth, sessions: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0 };
  });
}

export async function getTopPhotos(listingId: string, range: DateRange, limit = 5): Promise<TopPhotoEntry[]> {
  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('metadata')
    .eq('listing_id', listingId)
    .eq('event_type', 'photo_open');
  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data as { metadata: { asset_id?: string } }[]) {
    const id = row.metadata?.asset_id;
    if (id) counts[id] = (counts[id] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([asset_id, count]) => ({ asset_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getGeographicBreakdown(listingId: string, range: DateRange): Promise<{ countries: GeoBreakdownEntry[]; cities: GeoBreakdownEntry[] }> {
  const dateStart = getDateStart(range);

  let query = supabase
    .from('listing_events')
    .select('country, city')
    .eq('listing_id', listingId)
    .not('country', 'is', null);
  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  const rows = (data ?? []) as unknown as { country: string | null; city: string | null }[];
  if (rows.length === 0) return { countries: [], cities: [] };

  const countryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};

  for (const row of rows) {
    if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    if (row.city) cityCounts[row.city] = (cityCounts[row.city] || 0) + 1;
  }

  return {
    countries: Object.entries(countryCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    cities: Object.entries(cityCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export interface FunnelStep {
  label: string;
  count: number;
  rate: number;
}

export async function getConversionFunnel(
  listingIds: string[],
  range: DateRange
): Promise<FunnelStep[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);
  const steps: { type: EventType; label: string }[] = [
    { type: 'view', label: 'Page Views' },
    { type: 'photo_open', label: 'Photo Opens' },
    { type: 'realtor_contact_click', label: 'Contact Clicks' },
    { type: 'lead_submit', label: 'Leads Submitted' },
  ];

  const promises = steps.map(({ type }) => {
    let query = supabase
      .from('listing_events')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .eq('event_type', type);
    if (dateStart) query = query.gte('created_at', dateStart);
    return query;
  });

  const results = await Promise.all(promises);
  const topCount = results[0].count ?? 0;

  return steps.map((step, i) => {
    const count = results[i].count ?? 0;
    return {
      label: step.label,
      count,
      rate: topCount > 0 ? Math.round((count / topCount) * 100) : 0,
    };
  });
}

export type TimeSeriesMetric = 'views' | 'leads' | 'downloads';

export async function getMetricOverTime(
  listingIds: string[],
  range: DateRange,
  metric: TimeSeriesMetric
): Promise<DailyCount[]> {
  if (listingIds.length === 0) return [];

  const dateStart = getDateStart(range);

  if (metric === 'downloads') {
    let query = supabase
      .from('download_logs')
      .select('created_at')
      .in('listing_id', listingIds)
      .eq('status', 'success')
      .order('created_at', { ascending: true });
    if (dateStart) query = query.gte('created_at', dateStart);
    const { data } = await query;
    if (!data || data.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const row of data as { created_at: string }[]) {
      const date = row.created_at.slice(0, 10);
      counts[date] = (counts[date] || 0) + 1;
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }

  const eventType: EventType = metric === 'leads' ? 'lead_submit' : 'view';

  let query = supabase
    .from('listing_events')
    .select('created_at')
    .in('listing_id', listingIds)
    .eq('event_type', eventType)
    .order('created_at', { ascending: true });
  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data as { created_at: string }[]) {
    const date = row.created_at.slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

export async function getLeadsOverview(
  listingIds: string[],
  range: DateRange
): Promise<{ total: number; overTime: DailyCount[]; byListing: { listing_id: string; count: number }[] }> {
  if (listingIds.length === 0) return { total: 0, overTime: [], byListing: [] };

  const dateStart = getDateStart(range);

  let query = supabase
    .from('leads')
    .select('listing_id, created_at')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: true });
  if (dateStart) query = query.gte('created_at', dateStart);

  const { data } = await query;
  const rows = (data ?? []) as { listing_id: string; created_at: string }[];

  const overTime: Record<string, number> = {};
  const byListing: Record<string, number> = {};

  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    overTime[date] = (overTime[date] || 0) + 1;
    byListing[row.listing_id] = (byListing[row.listing_id] || 0) + 1;
  }

  return {
    total: rows.length,
    overTime: Object.entries(overTime).map(([date, count]) => ({ date, count })),
    byListing: Object.entries(byListing)
      .map(([listing_id, count]) => ({ listing_id, count }))
      .sort((a, b) => b.count - a.count),
  };
}
