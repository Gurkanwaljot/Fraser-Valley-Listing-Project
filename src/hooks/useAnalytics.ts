import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import {
  getOverviewMetrics,
  getViewsOverTime,
  getTopListings,
  getDeviceBreakdown,
  getReferrers,
  getEventBreakdown,
  getListingAnalytics,
  getConversionFunnel,
  getMetricOverTime,
  getLeadsOverview,
  type DateRange,
  type TimeSeriesMetric,
} from '../services/analyticsService';
import { getMarketingUsageReport } from '../services/marketingAnalyticsService';

function usePhotographerListingIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['photographer-listing-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('photographer_id', user.id);
      return (data ?? []).map((r) => (r as { id: string }).id);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useAnalyticsOverview(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-overview', listingIds, range],
    queryFn: () => getOverviewMetrics(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useViewsOverTime(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-views-over-time', listingIds, range],
    queryFn: () => getViewsOverTime(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useTopListings(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-top-listings', listingIds, range],
    queryFn: () => getTopListings(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useDeviceBreakdown(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-devices', listingIds, range],
    queryFn: () => getDeviceBreakdown(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useReferrers(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-referrers', listingIds, range],
    queryFn: () => getReferrers(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useEventBreakdown(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-event-breakdown', listingIds, range],
    queryFn: () => getEventBreakdown(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useListingAnalytics(listingId: string, range: DateRange) {
  return useQuery({
    queryKey: ['listing-analytics', listingId, range],
    queryFn: () => getListingAnalytics(listingId, range),
    enabled: !!listingId,
    staleTime: 30_000,
  });
}

export function useConversionFunnel(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-funnel', listingIds, range],
    queryFn: () => getConversionFunnel(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useMetricOverTime(range: DateRange, metric: TimeSeriesMetric) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-metric-over-time', listingIds, range, metric],
    queryFn: () => getMetricOverTime(listingIds, range, metric),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useLeadsOverview(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();

  const query = useQuery({
    queryKey: ['analytics-leads-overview', listingIds, range],
    queryFn: () => getLeadsOverview(listingIds, range),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}

export function useMarketingUsage(range: DateRange) {
  const { data: listingIds = [], isLoading: idsLoading } = usePhotographerListingIds();
  const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;

  const query = useQuery({
    queryKey: ['analytics-marketing-usage', listingIds, range],
    queryFn: () => getMarketingUsageReport(daysBack, listingIds),
    enabled: !idsLoading && listingIds.length > 0,
    staleTime: 30_000,
  });

  return { ...query, isLoading: query.isLoading || idsLoading };
}
