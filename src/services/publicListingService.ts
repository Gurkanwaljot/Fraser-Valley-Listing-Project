import { supabase } from '../lib/supabase';
import type { Listing, MediaAsset, Realtor, EventType } from '../types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listings() { return supabase.from('listings') as any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mediaAssets() { return supabase.from('media_assets') as any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listingRealtors() { return supabase.from('listing_realtors') as any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function realtorsTable() { return supabase.from('realtors') as any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leadsTable() { return supabase.from('leads') as any; }

export interface PublicListingData {
  listing: Listing;
  media: MediaAsset[];
  realtors: Realtor[];
  primaryRealtorId: string | null;
  isPreview?: boolean;
}

export async function getPublicListingBySlug(slug: string, allowPreview = false): Promise<PublicListingData | null> {
  let listing = null;
  let isPreview = false;

  // First try to find an active or sold listing (public access)
  const { data: activeListing, error: activeError } = await listings()
    .select('*')
    .eq('slug', slug)
    .in('status', ['active', 'sold'])
    .maybeSingle();

  if (!activeError && activeListing) {
    listing = activeListing;
  } else if (allowPreview) {
    // If no active listing found and preview mode allowed, try any status
    const { data: previewListing, error: previewError } = await listings()
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!previewError && previewListing) {
      listing = previewListing;
      isPreview = true;
    }
  }

  if (!listing) return null;

  const [mediaResult, realtorJunctionResult] = await Promise.all([
    mediaAssets()
      .select('*')
      .eq('listing_id', listing.id)
      .eq('is_public', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    listingRealtors()
      .select('realtor_id, is_primary')
      .eq('listing_id', listing.id),
  ]);

  const media = (mediaResult.data ?? []) as MediaAsset[];
  const junctions = (realtorJunctionResult.data ?? []) as { realtor_id: string; is_primary: boolean }[];
  const realtorIds = junctions.map((j) => j.realtor_id);
  const primaryRealtorId = junctions.find((j) => j.is_primary)?.realtor_id ?? null;

  let realtors: Realtor[] = [];
  if (realtorIds.length > 0) {
    const { data } = await realtorsTable()
      .select('*')
      .in('id', realtorIds)
      .eq('is_archived', false);
    realtors = (data ?? []) as Realtor[];
  }

  return { listing, media, realtors, primaryRealtorId, isPreview };
}

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

export { getSessionId };

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

const BOT_PATTERN = /bot|crawl|spider|googlebot|bingbot|yandex|baidu|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|bytespider|gptbot|chatgpt|claudebot|anthropic|semrush|ahrefs|mj12bot|dotbot|petalbot/i;

let currentUserId: string | null = null;

export function setTrackingUserId(userId: string | null): void {
  currentUserId = userId;
}

export function shouldTrack(photographerId?: string | null): boolean {
  if (BOT_PATTERN.test(navigator.userAgent)) return false;
  if (photographerId && currentUserId && currentUserId === photographerId) return false;
  return true;
}

const TRACK_EVENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;

let cachedUtm: Record<string, string> | null = null;

function getUtmParams(): Record<string, string> {
  if (cachedUtm) return cachedUtm;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const val = params.get(key);
      if (val) utm[key] = val;
    }
    cachedUtm = utm;
  } catch {
    cachedUtm = {};
  }
  return cachedUtm;
}

export function trackListingEvent(
  listingId: string,
  eventType: EventType,
  metadata: Record<string, unknown> = {},
  photographerId?: string | null
): void {
  if (!shouldTrack(photographerId)) return;

  const utm = getUtmParams();
  const payload = {
    listing_id: listingId,
    event_type: eventType,
    session_id: getSessionId(),
    metadata: { ...metadata, ...utm, user_agent: navigator.userAgent },
    referrer: document.referrer || null,
    device_type: getDeviceType(),
  };

  fetch(TRACK_EVENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).then((res) => {
    if (!res.ok && import.meta.env.DEV) {
      res.json().then((body) => {
        console.warn(`[analytics] track-event failed (${res.status}):`, body);
      }).catch(() => {});
    }
  }).catch(() => {});
}

export async function submitLead(params: {
  listingId: string;
  realtorId: string | null;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  listing: Listing;
  realtors: Realtor[];
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await leadsTable().insert({
    listing_id: params.listingId,
    realtor_id: params.realtorId,
    name: params.name,
    email: params.email,
    phone: params.phone,
    message: params.message,
    source: 'public_listing',
    status: 'new',
  });

  if (error) return { success: false, error: error.message };

  trackListingEvent(params.listingId, 'lead_submit', { realtor_id: params.realtorId });

  const realtorsWithEmail = params.realtors.filter((r) => r.email);
  if (realtorsWithEmail.length > 0) {
    const address = [
      params.listing.address_line_1,
      params.listing.address_line_2,
      params.listing.city,
      params.listing.province_state,
      params.listing.postal_code,
    ]
      .filter(Boolean)
      .join(', ');

    const publicListingUrl = `${window.location.origin}/listing/${params.listing.slug}`;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-email`;
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderName: params.name,
        senderEmail: params.email,
        senderPhone: params.phone,
        message: params.message,
        listingTitle: params.listing.title,
        listingAddress: address,
        publicListingUrl,
        realtors: realtorsWithEmail.map((r) => ({ name: r.full_name, email: r.email })),
      }),
    }).catch(() => {});
  }

  return { success: true };
}
