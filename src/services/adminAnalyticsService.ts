import { supabase } from '../lib/supabase';

export interface PlatformKPIs {
  totalPhotographers: number;
  activeListings: number;
  totalRealtors: number;
  totalLeads: number;
  prevPhotographers: number;
  prevListings: number;
  prevRealtors: number;
  prevLeads: number;
}

export interface DailyEventCount {
  date: string;
  count: number;
}

export interface PhotographerLeaderEntry {
  user_id: string;
  name: string;
  active_listings: number;
  views: number;
  downloads: number;
}

export interface GeoEntry {
  location: string;
  count: number;
}

export interface SystemHealth {
  failedDownloads7d: number;
  pendingInvitations: number;
  eventsToday: number;
  eventsYesterday: number;
}

function getMonthStart(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getPlatformKPIs(): Promise<PlatformKPIs> {
  const thisMonth = getMonthStart(0);
  const lastMonth = getMonthStart(1);

  const [photographers, listings, realtors, leads, prevPhotographers, prevListings, prevRealtors, prevLeads] =
    await Promise.all([
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'photographer'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('realtors').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'photographer').lt('created_at', thisMonth),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active').lt('created_at', thisMonth),
      supabase.from('realtors').select('id', { count: 'exact', head: true }).eq('is_archived', false).lt('created_at', thisMonth),
      supabase.from('leads').select('id', { count: 'exact', head: true }).lt('created_at', lastMonth),
    ]);

  return {
    totalPhotographers: photographers.count ?? 0,
    activeListings: listings.count ?? 0,
    totalRealtors: realtors.count ?? 0,
    totalLeads: leads.count ?? 0,
    prevPhotographers: prevPhotographers.count ?? 0,
    prevListings: prevListings.count ?? 0,
    prevRealtors: prevRealtors.count ?? 0,
    prevLeads: prevLeads.count ?? 0,
  };
}

export async function getEventsPerDay(): Promise<DailyEventCount[]> {
  const thirtyDaysAgo = getDaysAgo(30);

  const { data } = await supabase
    .from('listing_events')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data as { created_at: string }[]) {
    const date = row.created_at.slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

export async function getPhotographerLeaderboard(): Promise<PhotographerLeaderEntry[]> {
  const thirtyDaysAgo = getDaysAgo(30);

  const { data: photographers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'photographer');

  if (!photographers || photographers.length === 0) return [];

  const userIds = (photographers as { user_id: string }[]).map((p) => p.user_id);

  const [profilesResult, listingsResult, viewEventsResult, downloadLogsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase.from('listings').select('id, photographer_id, status').in('photographer_id', userIds),
    supabase
      .from('listing_events')
      .select('listing_id')
      .gte('created_at', thirtyDaysAgo)
      .eq('event_type', 'view'),
    supabase
      .from('download_logs')
      .select('listing_id')
      .gte('created_at', thirtyDaysAgo)
      .eq('status', 'success'),
  ]);

  const profiles = new Map(
    ((profilesResult.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name])
  );

  const listingsByPhotographer = new Map<string, { active: number; ids: string[] }>();
  for (const l of (listingsResult.data ?? []) as { id: string; photographer_id: string; status: string }[]) {
    const entry = listingsByPhotographer.get(l.photographer_id) || { active: 0, ids: [] };
    entry.ids.push(l.id);
    if (l.status === 'active') entry.active++;
    listingsByPhotographer.set(l.photographer_id, entry);
  }

  const viewsByListing = new Map<string, number>();
  for (const e of (viewEventsResult.data ?? []) as { listing_id: string }[]) {
    viewsByListing.set(e.listing_id, (viewsByListing.get(e.listing_id) || 0) + 1);
  }

  const downloadsByListing = new Map<string, number>();
  for (const d of (downloadLogsResult.data ?? []) as { listing_id: string }[]) {
    downloadsByListing.set(d.listing_id, (downloadsByListing.get(d.listing_id) || 0) + 1);
  }

  const leaderboard: PhotographerLeaderEntry[] = userIds.map((uid) => {
    const info = listingsByPhotographer.get(uid) || { active: 0, ids: [] };
    let views = 0;
    let downloads = 0;
    for (const lid of info.ids) {
      views += viewsByListing.get(lid) || 0;
      downloads += downloadsByListing.get(lid) || 0;
    }
    return {
      user_id: uid,
      name: profiles.get(uid) || 'Unknown',
      active_listings: info.active,
      views,
      downloads,
    };
  });

  return leaderboard
    .sort((a, b) => (b.active_listings + b.views) - (a.active_listings + a.views))
    .slice(0, 10);
}

export async function getGeographicDistribution(): Promise<{ countries: GeoEntry[]; cities: GeoEntry[] }> {
  const { data } = await supabase
    .from('listing_events')
    .select('country, city')
    .not('country', 'is', null)
    .gte('created_at', getDaysAgo(30));

  const rows = (data ?? []) as unknown as { country: string | null; city: string | null }[];
  if (rows.length === 0) return { countries: [], cities: [] };

  const countryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};

  for (const row of rows) {
    if (row.country) countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    if (row.city) cityCounts[row.city] = (cityCounts[row.city] || 0) + 1;
  }

  const countries = Object.entries(countryCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const cities = Object.entries(cityCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { countries, cities };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const sevenDaysAgo = getDaysAgo(7);
  const today = getToday();
  const yesterday = getDaysAgo(1);

  const [failedDownloads, pendingInvitations, eventsToday, eventsYesterday] = await Promise.all([
    supabase.from('download_logs').select('id', { count: 'exact', head: true })
      .eq('status', 'failed').gte('created_at', sevenDaysAgo),
    supabase.from('user_invitations').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('listing_events').select('id', { count: 'exact', head: true })
      .gte('created_at', today),
    supabase.from('listing_events').select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday).lt('created_at', today),
  ]);

  return {
    failedDownloads7d: failedDownloads.count ?? 0,
    pendingInvitations: pendingInvitations.count ?? 0,
    eventsToday: eventsToday.count ?? 0,
    eventsYesterday: eventsYesterday.count ?? 0,
  };
}
