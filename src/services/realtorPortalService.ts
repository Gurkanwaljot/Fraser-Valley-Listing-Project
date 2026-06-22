import { supabase } from '../lib/supabase';
import type { Realtor, Listing, ListingShare } from '../types/database';

export interface RealtorListingCard {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'status' | 'address_line_1' | 'city' | 'province_state'>;
  share: Pick<ListingShare, 'share_token' | 'created_at' | 'expires_at' | 'accessed_at'>;
  heroImageUrl: string | null;
}

interface ShareRow {
  share_token: string;
  created_at: string;
  expires_at: string | null;
  accessed_at: string | null;
  listing_id: string;
  listings: {
    id: string;
    title: string;
    slug: string;
    status: string;
    address_line_1: string;
    city: string;
    province_state: string;
    hero_media_id: string | null;
  } | null;
}

interface MediaRow {
  thumbnail_url: string | null;
  public_url: string | null;
}

export async function getRealtorProfile(): Promise<Realtor | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('realtors')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return data as Realtor | null;
}

export async function getRealtorListings(realtorId: string): Promise<RealtorListingCard[]> {
  const { data: shares } = await supabase
    .from('listing_shares')
    .select(`
      share_token,
      created_at,
      expires_at,
      accessed_at,
      listing_id,
      listings (
        id,
        title,
        slug,
        status,
        address_line_1,
        city,
        province_state,
        hero_media_id
      )
    `)
    .eq('realtor_id', realtorId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (!shares || shares.length === 0) return [];

  const typedShares = shares as unknown as ShareRow[];
  const results: RealtorListingCard[] = [];
  const seenListings = new Set<string>();

  for (const share of typedShares) {
    const listing = share.listings;
    if (!listing) continue;
    if (listing.status !== 'active' && listing.status !== 'sold') continue;
    if (seenListings.has(listing.id)) continue;
    seenListings.add(listing.id);

    let heroImageUrl: string | null = null;
    if (listing.hero_media_id) {
      const { data: heroAsset } = await supabase
        .from('media_assets')
        .select('thumbnail_url, public_url')
        .eq('id', listing.hero_media_id)
        .maybeSingle();

      const typed = heroAsset as unknown as MediaRow | null;
      if (typed) {
        heroImageUrl = typed.thumbnail_url || typed.public_url || null;
      }
    }

    if (!heroImageUrl) {
      const { data: fallbackAsset } = await supabase
        .from('media_assets')
        .select('thumbnail_url, public_url')
        .eq('listing_id', listing.id)
        .eq('kind', 'photo')
        .eq('is_public', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      const fallbackTyped = fallbackAsset as unknown as MediaRow | null;
      if (fallbackTyped) {
        heroImageUrl = fallbackTyped.thumbnail_url || fallbackTyped.public_url || null;
      }
    }

    results.push({
      listing: {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        status: listing.status as Listing['status'],
        address_line_1: listing.address_line_1,
        city: listing.city,
        province_state: listing.province_state,
      },
      share: {
        share_token: share.share_token,
        created_at: share.created_at,
        expires_at: share.expires_at,
        accessed_at: share.accessed_at,
      },
      heroImageUrl,
    });
  }

  return results;
}
