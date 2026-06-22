import { supabase } from '../lib/supabase';
import { checkSlugUniqueness } from '../utils/slugify';
import type { Listing, ListingStatus, ListingRealtor } from '../types/database';

export interface ListingFilters {
  status?: ListingStatus;
}

export interface ListingWithRealtors extends Listing {
  realtors: { id: string; full_name: string; is_primary: boolean }[];
}

export async function getListings(
  photographerId: string,
  filters?: ListingFilters
): Promise<ListingWithRealtors[]> {
  let query = supabase
    .from('listings')
    .select('*, listing_realtors(realtor_id, is_primary, realtors(id, full_name, is_archived))')
    .eq('photographer_id', photographerId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((listing) => {
    const realtorEntries = listing.listing_realtors ?? [];
    return {
      ...listing,
      listing_realtors: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtors: realtorEntries
        .filter((lr: any) => lr.realtors && !lr.realtors.is_archived)
        .map((lr: any) => ({
          id: lr.realtors?.id ?? lr.realtor_id,
          full_name: lr.realtors?.full_name ?? '',
          is_primary: lr.is_primary,
        })),
    };
  }) as ListingWithRealtors[];
}

export async function getListingById(id: string): Promise<ListingWithRealtors | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_realtors(realtor_id, is_primary, realtors(id, full_name, is_archived))')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = data as any;
  const realtorEntries = listing.listing_realtors ?? [];

  return {
    ...listing,
    listing_realtors: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtors: realtorEntries
      .filter((lr: any) => lr.realtors && !lr.realtors.is_archived)
      .map((lr: any) => ({
        id: lr.realtors?.id ?? lr.realtor_id,
        full_name: lr.realtors?.full_name ?? '',
        is_primary: lr.is_primary,
      })),
  } as ListingWithRealtors;
}

export interface CreateListingData {
  title: string;
  slug: string;
  property_type?: string;
  description?: string;
  price?: number;
  property_taxes?: number;
  currency?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  province_state: string;
  postal_code: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  lot_size?: string;
  year_built?: number;
  mls_number?: string;
  features?: string[];
  section_order?: string[] | null;
  hidden_sections?: string[] | null;
  interactive_floor_plan_embed?: string | null;
}

export async function createListing(
  photographerId: string,
  data: CreateListingData
): Promise<Listing> {
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      photographer_id: photographerId,
      title: data.title,
      slug: data.slug,
      status: 'draft',
      property_type: data.property_type || null,
      description: data.description || null,
      price: data.price ?? null,
      property_taxes: data.property_taxes ?? null,
      currency: data.currency || 'CAD',
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2 || null,
      city: data.city,
      province_state: data.province_state,
      postal_code: data.postal_code,
      country: data.country || 'Canada',
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      square_footage: data.square_footage ?? null,
      lot_size: data.lot_size || null,
      year_built: data.year_built ?? null,
      mls_number: data.mls_number || null,
      features: data.features || [],
    } as never)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: your account may not have the photographer role assigned. Contact an administrator.');
    }
    if (error.code === '23505') {
      throw new Error(`A listing with the slug "${data.slug}" already exists. Please choose a different URL slug.`);
    }
    throw new Error(error.message || 'Failed to create listing');
  }
  return listing as unknown as Listing;
}

export async function updateListing(
  id: string,
  data: Partial<CreateListingData>
): Promise<Listing> {
  const { data: listing, error } = await supabase
    .from('listings')
    .update(data as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: you do not have access to update this listing.');
    }
    if (error.code === '23505') {
      throw new Error('A listing with this slug already exists. Please choose a different URL slug.');
    }
    throw new Error(error.message || 'Failed to update listing');
  }
  return listing as unknown as Listing;
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: you do not have access to delete this listing.');
    }
    throw new Error(error.message || 'Failed to delete listing');
  }
}

const VALID_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['active'],
  active: ['draft', 'pending', 'sold', 'archived'],
  pending: ['active', 'sold', 'archived'],
  sold: ['active'],
  archived: ['active'],
};

export function getValidTransitions(currentStatus: ListingStatus): ListingStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

export async function changeListingStatus(
  id: string,
  newStatus: ListingStatus
): Promise<Listing> {
  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'active') {
    updates.published_at = new Date().toISOString();
    updates.archived_at = null;
  } else if (newStatus === 'archived') {
    updates.archived_at = new Date().toISOString();
  } else if (newStatus === 'draft') {
    updates.published_at = null;
    updates.archived_at = null;
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: you do not have access to change this listing status.');
    }
    throw new Error(error.message || 'Failed to change listing status');
  }
  return listing as unknown as Listing;
}

export async function assignRealtor(
  listingId: string,
  realtorId: string,
  assignedBy: string,
  isPrimary: boolean = false
): Promise<ListingRealtor> {
  const { data, error } = await supabase
    .from('listing_realtors')
    .insert({
      listing_id: listingId,
      realtor_id: realtorId,
      assigned_by: assignedBy,
      is_primary: isPrimary,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ListingRealtor;
}

export async function unassignRealtor(
  listingId: string,
  realtorId: string
): Promise<void> {
  const { data: removed } = await supabase
    .from('listing_realtors')
    .select('is_primary')
    .eq('listing_id', listingId)
    .eq('realtor_id', realtorId)
    .maybeSingle() as { data: { is_primary: boolean } | null };

  const { error } = await supabase
    .from('listing_realtors')
    .delete()
    .eq('listing_id', listingId)
    .eq('realtor_id', realtorId);

  if (error) throw error;

  if (removed?.is_primary) {
    const { data: remaining } = await supabase
      .from('listing_realtors')
      .select('realtor_id')
      .eq('listing_id', listingId)
      .limit(1) as { data: { realtor_id: string }[] | null };

    if (remaining && remaining.length > 0) {
      await supabase
        .from('listing_realtors')
        .update({ is_primary: true } as never)
        .eq('listing_id', listingId)
        .eq('realtor_id', remaining[0].realtor_id);
    }
  }
}

export async function setRealtorAsPrimary(
  listingId: string,
  realtorId: string
): Promise<void> {
  await supabase
    .from('listing_realtors')
    .update({ is_primary: false } as never)
    .eq('listing_id', listingId);

  const { error } = await supabase
    .from('listing_realtors')
    .update({ is_primary: true } as never)
    .eq('listing_id', listingId)
    .eq('realtor_id', realtorId);

  if (error) throw error;
}

export async function getListingRealtors(listingId: string): Promise<
  (ListingRealtor & { realtor: { full_name: string; email: string } })[]
> {
  const { data, error } = await supabase
    .from('listing_realtors')
    .select('*, realtors(full_name, email)')
    .eq('listing_id', listingId);

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((lr) => ({
    ...lr,
    realtor: lr.realtors as { full_name: string; email: string },
  })) as (ListingRealtor & { realtor: { full_name: string; email: string } })[];
}

export async function duplicateListing(
  id: string,
  photographerId: string
): Promise<string> {
  const source = await getListingById(id);
  if (!source) throw new Error('Listing not found');

  let slug = `${source.slug}-copy`;
  let counter = 1;
  while (!(await checkSlugUniqueness(slug))) {
    slug = `${source.slug}-copy-${counter}`;
    counter++;
  }

  const { data: newListing, error } = await supabase
    .from('listings')
    .insert({
      photographer_id: photographerId,
      title: source.title,
      slug,
      status: 'draft',
      property_type: source.property_type,
      description: source.description,
      price: source.price,
      property_taxes: source.property_taxes,
      currency: source.currency,
      address_line_1: source.address_line_1,
      address_line_2: source.address_line_2,
      city: source.city,
      province_state: source.province_state,
      postal_code: source.postal_code,
      country: source.country,
      latitude: source.latitude,
      longitude: source.longitude,
      bedrooms: source.bedrooms,
      bathrooms: source.bathrooms,
      square_footage: source.square_footage,
      lot_size: source.lot_size,
      year_built: source.year_built,
      mls_number: source.mls_number,
      features: source.features,
      section_order: source.section_order,
      hidden_sections: source.hidden_sections,
      interactive_floor_plan_embed: source.interactive_floor_plan_embed,
    } as never)
    .select('id')
    .single();

  if (error) throw new Error(error.message || 'Failed to duplicate listing');

  const newId = (newListing as { id: string }).id;

  if (source.realtors.length > 0) {
    const assignments = source.realtors.map((r) => ({
      listing_id: newId,
      realtor_id: r.id,
      assigned_by: photographerId,
      is_primary: r.is_primary,
    }));
    await supabase.from('listing_realtors').insert(assignments as never);
  }

  return newId;
}

export interface DashboardMetrics {
  activeListings: number;
  totalViews: number;
  totalDownloads: number;
  totalRealtors: number;
}

export async function getDashboardMetrics(photographerId: string): Promise<DashboardMetrics> {
  const [listingsRes, realtorsRes] = await Promise.all([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('photographer_id', photographerId)
      .eq('status', 'active'),
    supabase
      .from('realtors')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', photographerId)
      .eq('is_archived', false),
  ]);

  const listingIdsRes = await supabase
    .from('listings')
    .select('id')
    .eq('photographer_id', photographerId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingIds = ((listingIdsRes.data as any[]) ?? []).map((l) => l.id) as string[];

  let totalViews = 0;
  let totalDownloads = 0;

  if (listingIds.length > 0) {
    const [viewsRes, downloadsRes] = await Promise.all([
      supabase
        .from('listing_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'view')
        .in('listing_id', listingIds),
      supabase
        .from('download_logs')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds),
    ]);
    totalViews = viewsRes.count ?? 0;
    totalDownloads = downloadsRes.count ?? 0;
  }

  return {
    activeListings: listingsRes.count ?? 0,
    totalViews,
    totalDownloads,
    totalRealtors: realtorsRes.count ?? 0,
  };
}
