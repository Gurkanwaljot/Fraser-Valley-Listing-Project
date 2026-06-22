import { supabase } from '../lib/supabase';
import type { EventType } from '../types/database';

const TRACK_EVENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;

export function trackMarketingEvent(
  listingId: string,
  eventType: EventType,
  metadata: Record<string, unknown> = {},
): void {
  const payload = {
    listing_id: listingId,
    event_type: eventType,
    session_id: crypto.randomUUID(),
    metadata: { ...metadata, user_agent: navigator.userAgent },
    referrer: null,
    device_type: 'desktop',
  };

  fetch(TRACK_EVENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).then((res) => {
    if (!res.ok && import.meta.env.DEV) {
      res.json().then((body) => {
        console.warn(`[marketing-analytics] track-event failed (${res.status}):`, body);
      }).catch(() => {});
    }
  }).catch(() => {});
}

export type MarketingEventType =
  | 'marketing_kit_open'
  | 'brochure_open' | 'brochure_export'
  | 'social_post_open' | 'social_post_export'
  | 'reel_open' | 'reel_export'
  | 'realtor_portal_view';

export interface MarketingUsageEntry {
  event_type: string;
  count: number;
}

export interface TemplateUsageEntry {
  template: string;
  count: number;
}

export interface MarketingUsageReport {
  totals: MarketingUsageEntry[];
  topBrochureTemplates: TemplateUsageEntry[];
  topSocialTemplates: TemplateUsageEntry[];
  topReelExports: number;
}

export async function getMarketingUsageReport(daysBack = 30, listingIds?: string[]): Promise<MarketingUsageReport> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  let query = supabase
    .from('listing_events')
    .select('event_type, metadata')
    .in('event_type', [
      'marketing_kit_open', 'brochure_open', 'brochure_export',
      'social_post_open', 'social_post_export', 'reel_open', 'reel_export',
      'realtor_portal_view',
    ])
    .gte('created_at', since.toISOString());

  if (listingIds && listingIds.length > 0) {
    query = query.in('listing_id', listingIds);
  }

  const { data } = await query;

  const rows = (data ?? []) as { event_type: string; metadata: Record<string, unknown> }[];

  const totals = new Map<string, number>();
  const brochureTemplates = new Map<string, number>();
  const socialTemplates = new Map<string, number>();
  let reelExports = 0;

  for (const row of rows) {
    totals.set(row.event_type, (totals.get(row.event_type) || 0) + 1);

    const template = row.metadata?.template as string | undefined;
    if (row.event_type === 'brochure_export' && template) {
      brochureTemplates.set(template, (brochureTemplates.get(template) || 0) + 1);
    }
    if (row.event_type === 'social_post_export' && template) {
      socialTemplates.set(template, (socialTemplates.get(template) || 0) + 1);
    }
    if (row.event_type === 'reel_export') {
      reelExports++;
    }
  }

  return {
    totals: Array.from(totals.entries())
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count),
    topBrochureTemplates: Array.from(brochureTemplates.entries())
      .map(([template, count]) => ({ template, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topSocialTemplates: Array.from(socialTemplates.entries())
      .map(([template, count]) => ({ template, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topReelExports: reelExports,
  };
}
