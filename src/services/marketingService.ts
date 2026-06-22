import { supabase } from '../lib/supabase';
import type { Listing, MediaAsset, Realtor } from '../types/database';

export interface MarketingListingData {
  listing: Listing;
  photos: MediaAsset[];
  floorPlans: MediaAsset[];
  realtors: Realtor[];
}

export async function getMarketingData(
  listingSlug: string,
  shareToken: string
): Promise<MarketingListingData | null> {
  const { data: share } = await supabase
    .from('listing_shares')
    .select('listing_id, realtor_id')
    .eq('share_token', shareToken)
    .is('revoked_at', null)
    .maybeSingle();

  const shareRow = share as { listing_id: string; realtor_id: string } | null;
  if (!shareRow) return null;

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', shareRow.listing_id)
    .eq('slug', listingSlug)
    .maybeSingle();

  if (!listing) return null;
  const typedListing = listing as unknown as Listing;

  const { data: photos } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', typedListing.id)
    .eq('kind', 'photo')
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  const { data: floorPlans } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', typedListing.id)
    .eq('kind', 'floor_plan')
    .order('sort_order', { ascending: true });

  const { data: listingRealtors } = await supabase
    .from('listing_realtors')
    .select('realtor_id')
    .eq('listing_id', typedListing.id);

  let realtors: Realtor[] = [];
  const typedLR = listingRealtors as { realtor_id: string }[] | null;
  const realtorIds = new Set<string>();

  if (typedLR && typedLR.length > 0) {
    typedLR.forEach((lr) => realtorIds.add(lr.realtor_id));
  }
  // Also include the realtor from the share token as fallback
  if (shareRow.realtor_id) {
    realtorIds.add(shareRow.realtor_id);
  }

  if (realtorIds.size > 0) {
    const { data: realtorData } = await supabase
      .from('realtors')
      .select('*')
      .in('id', Array.from(realtorIds));
    if (realtorData) realtors = realtorData as unknown as Realtor[];
  }

  return {
    listing: typedListing,
    photos: (photos || []) as unknown as MediaAsset[],
    floorPlans: (floorPlans || []) as unknown as MediaAsset[],
    realtors,
  };
}

export async function getMarketingDataDirect(
  listingSlug: string
): Promise<MarketingListingData | null> {
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', listingSlug)
    .maybeSingle();

  if (!listing) return null;
  const typedListing = listing as unknown as Listing;

  const { data: photos } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', typedListing.id)
    .eq('kind', 'photo')
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  const { data: floorPlans } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', typedListing.id)
    .eq('kind', 'floor_plan')
    .order('sort_order', { ascending: true });

  const { data: listingRealtors } = await supabase
    .from('listing_realtors')
    .select('realtor_id')
    .eq('listing_id', typedListing.id);

  let realtors: Realtor[] = [];
  const typedLR = listingRealtors as { realtor_id: string }[] | null;
  if (typedLR && typedLR.length > 0) {
    const realtorIds = typedLR.map((lr) => lr.realtor_id);
    const { data: realtorData } = await supabase
      .from('realtors')
      .select('*')
      .in('id', realtorIds);
    if (realtorData) realtors = realtorData as unknown as Realtor[];
  }

  return {
    listing: typedListing,
    photos: (photos || []) as unknown as MediaAsset[],
    floorPlans: (floorPlans || []) as unknown as MediaAsset[],
    realtors,
  };
}

export function formatPrice(price: number | null, currency: string): string {
  if (!price) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatCurrencyCents(amount: number | null, currency: string): string {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatStreetAddress(listing: Pick<Listing, 'address_line_1' | 'address_line_2'>): string {
  if (listing.address_line_2) {
    return `${listing.address_line_2} - ${listing.address_line_1}`;
  }
  return listing.address_line_1;
}

export function formatAddress(listing: Listing): string {
  const parts = [formatStreetAddress(listing), listing.city, listing.province_state];
  return parts.filter(Boolean).join(', ');
}

export function getListingStats(listing: Listing): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [];
  if (listing.bedrooms) stats.push({ label: 'Beds', value: String(listing.bedrooms) });
  if (listing.bathrooms) stats.push({ label: 'Baths', value: String(listing.bathrooms) });
  if (listing.square_footage) stats.push({ label: 'Living Area', value: `${listing.square_footage.toLocaleString()} sq. ft.` });
  if (listing.lot_size) stats.push({ label: 'Lot', value: `${listing.lot_size} sq. ft.` });
  if (listing.year_built) stats.push({ label: 'Built', value: String(listing.year_built) });
  return stats;
}
