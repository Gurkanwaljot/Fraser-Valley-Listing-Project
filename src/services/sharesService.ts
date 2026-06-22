import { supabase } from '../lib/supabase';
import { getMediaSummary } from './mediaService';
import type { ListingShare } from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
}

export interface ShareWithRealtor extends ListingShare {
  realtor: { full_name: string; email: string };
}

export async function getListingShares(listingId: string): Promise<ShareWithRealtor[]> {
  const { data, error } = await supabase
    .from('listing_shares')
    .select('*, realtors(full_name, email)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((share) => ({
    ...share,
    realtor: share.realtors as { full_name: string; email: string },
    realtors: undefined,
  })) as ShareWithRealtor[];
}

export type ShareStatus = 'active' | 'expired' | 'revoked' | 'accessed';

export function getShareStatus(share: ListingShare): ShareStatus {
  if (share.revoked_at) return 'revoked';
  if (share.expires_at && new Date(share.expires_at) < new Date()) return 'expired';
  if (share.accessed_at) return 'accessed';
  return 'active';
}

export interface CreateShareInput {
  listingId: string;
  realtorIds: string[];
  sharedBy: string;
  expiresInDays?: number;
}

export interface CreateShareResult {
  shares: ListingShare[];
  emailsSent: number;
  emailsFailed: string[];
}

interface ListingRow {
  title: string;
  slug: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  province_state: string;
  hero_media_id: string | null;
}

interface ProfileRow {
  full_name: string;
  company_name: string | null;
}

interface RealtorRow {
  full_name: string;
  email: string;
}

interface MediaRow {
  public_url: string | null;
  thumbnail_url: string | null;
}

export async function createListingShares(input: CreateShareInput): Promise<CreateShareResult> {
  const { listingId, realtorIds, sharedBy, expiresInDays = 5 } = input;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const shares: ListingShare[] = [];
  const emailsFailed: string[] = [];
  let emailsSent = 0;

  const { data: listingRaw } = await supabase
    .from('listings')
    .select('title, slug, address_line_1, address_line_2, city, province_state, hero_media_id')
    .eq('id', listingId)
    .maybeSingle();

  const listing = listingRaw as unknown as ListingRow | null;
  if (!listing) throw new Error('Listing not found');

  let heroUrl: string | null = null;
  if (listing.hero_media_id) {
    const { data: heroRaw } = await supabase
      .from('media_assets')
      .select('public_url, thumbnail_url')
      .eq('id', listing.hero_media_id)
      .maybeSingle();
    const heroMedia = heroRaw as unknown as MediaRow | null;
    heroUrl = heroMedia?.public_url || heroMedia?.thumbnail_url || null;
  }

  const { data: photographerRaw } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', sharedBy)
    .maybeSingle();

  const photographer = photographerRaw as unknown as ProfileRow | null;
  const photographerName = photographer?.company_name || photographer?.full_name || 'Your Photographer';

  const mediaSummary = await getMediaSummary(listingId);

  for (const realtorId of realtorIds) {
    const { data: existingRaw } = await supabase
      .from('listing_shares')
      .select('id')
      .eq('listing_id', listingId)
      .eq('realtor_id', realtorId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    const existingShare = existingRaw as unknown as { id: string } | null;

    if (existingShare) {
      await supabase
        .from('listing_shares')
        .update({ revoked_at: new Date().toISOString() } as never)
        .eq('id', existingShare.id);
    }

    const shareToken = crypto.randomUUID();

    const { data: share, error } = await supabase
      .from('listing_shares')
      .insert({
        listing_id: listingId,
        realtor_id: realtorId,
        shared_by: sharedBy,
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
      } as never)
      .select()
      .single();

    if (error) throw error;
    shares.push(share as unknown as ListingShare);

    const { data: realtorRaw } = await supabase
      .from('realtors')
      .select('full_name, email')
      .eq('id', realtorId)
      .maybeSingle();

    const realtor = realtorRaw as unknown as RealtorRow | null;

    if (realtor?.email) {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-share-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            realtorName: realtor.full_name,
            realtorEmail: realtor.email,
            listingTitle: listing.title,
            listingAddress: `${listing.address_line_2 ? `${listing.address_line_2} - ${listing.address_line_1}` : listing.address_line_1}, ${listing.city}, ${listing.province_state}`,
            listingHeroUrl: heroUrl,
            listingSlug: listing.slug,
            shareToken,
            photographerName,
            expiresAt: expiresAt.toISOString(),
            mediaSummary,
          }),
        });

        if (response.ok) {
          emailsSent++;
        } else {
          emailsFailed.push(realtor.email);
        }
      } catch {
        emailsFailed.push(realtor.email);
      }
    }
  }

  return { shares, emailsSent, emailsFailed };
}

export async function revokeShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('listing_shares')
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq('id', shareId);

  if (error) throw error;
}

export interface ShareValidation {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'revoked';
  share?: ListingShare;
  listing?: {
    id: string;
    title: string;
    slug: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    province_state: string;
    photographer_id: string;
  };
  realtor?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ShareRow {
  id: string;
  listing_id: string;
  realtor_id: string;
  shared_by: string;
  share_token: string;
  expires_at: string | null;
  accessed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  realtors: { id: string; full_name: string; email: string };
  listings: { id: string; title: string; slug: string; address_line_1: string; address_line_2: string | null; city: string; province_state: string; photographer_id: string };
}

export async function validateShareToken(token: string): Promise<ShareValidation> {
  const { data: raw } = await supabase
    .from('listing_shares')
    .select('*, realtors(id, full_name, email), listings(id, title, slug, address_line_1, address_line_2, city, province_state, photographer_id)')
    .eq('share_token', token)
    .maybeSingle();

  const share = raw as unknown as ShareRow | null;

  if (!share) return { valid: false, reason: 'not_found' };
  if (share.revoked_at) return { valid: false, reason: 'revoked' };
  if (share.expires_at && new Date(share.expires_at) < new Date()) return { valid: false, reason: 'expired' };

  return {
    valid: true,
    share: {
      id: share.id,
      listing_id: share.listing_id,
      realtor_id: share.realtor_id,
      shared_by: share.shared_by,
      share_token: share.share_token,
      expires_at: share.expires_at,
      accessed_at: share.accessed_at,
      revoked_at: share.revoked_at,
      created_at: share.created_at,
      updated_at: share.updated_at,
    },
    listing: share.listings,
    realtor: share.realtors,
  };
}

export async function markShareAccessed(shareId: string): Promise<void> {
  await supabase
    .from('listing_shares')
    .update({ accessed_at: new Date().toISOString() } as never)
    .eq('id', shareId)
    .is('accessed_at', null);
}

export async function logDownload(params: {
  listingId: string;
  realtorId?: string;
  userId?: string;
  mediaAssetId?: string;
  downloadType: 'single' | 'bulk_zip';
  assetIds?: string[];
  fileCount?: number;
  totalSizeBytes?: number;
  status?: 'success' | 'failed' | 'partial';
  failureReason?: string;
}): Promise<void> {
  await supabase.from('download_logs').insert({
    listing_id: params.listingId,
    realtor_id: params.realtorId || null,
    user_id: params.userId || null,
    media_asset_id: params.mediaAssetId || null,
    download_type: params.downloadType,
    asset_ids: params.assetIds || null,
    file_count: params.fileCount || null,
    total_size_bytes: params.totalSizeBytes || null,
    status: params.status || 'success',
    failure_reason: params.failureReason || null,
  } as never);
}

export async function resendShare(
  listingId: string,
  realtorId: string,
  sharedBy: string,
): Promise<ListingShare> {
  const result = await createListingShares({
    listingId,
    realtorIds: [realtorId],
    sharedBy,
    expiresInDays: 5,
  });
  if (result.shares.length === 0) throw new Error('Failed to create share');
  return result.shares[0];
}

export async function resendExpiredShares(
  listingId: string,
  realtorIds: string[],
  sharedBy: string,
): Promise<{ sent: number; failed: number }> {
  const result = await createListingShares({
    listingId,
    realtorIds,
    sharedBy,
    expiresInDays: 5,
  });
  return { sent: result.emailsSent, failed: result.emailsFailed.length };
}

export { type MediaSummary } from './mediaService';
