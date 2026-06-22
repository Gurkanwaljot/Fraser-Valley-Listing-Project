import { supabase } from '../lib/supabase';
import type { Realtor } from '../types/database';

export interface RealtorFilters {
  search?: string;
  includeArchived?: boolean;
}

export interface RealtorWithListingCount extends Realtor {
  listing_count: number;
}

export async function getRealtors(
  _photographerId: string,
  filters?: RealtorFilters
): Promise<RealtorWithListingCount[]> {
  let query = supabase
    .from('realtors')
    .select('*')
    .order('full_name', { ascending: true });

  if (!filters?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,brokerage.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const realtors = (data ?? []) as unknown as Realtor[];
  const realtorIds = realtors.map((r) => r.id);
  let listingCounts: Record<string, number> = {};

  if (realtorIds.length > 0) {
    const { data: counts } = await supabase
      .from('listing_realtors')
      .select('realtor_id')
      .in('realtor_id', realtorIds);

    if (counts) {
      listingCounts = (counts as unknown as { realtor_id: string }[]).reduce((acc, row) => {
        acc[row.realtor_id] = (acc[row.realtor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  return realtors.map((r) => ({
    ...r,
    listing_count: listingCounts[r.id] || 0,
  }));
}

export async function getRealtorById(id: string): Promise<Realtor | null> {
  const { data, error } = await supabase
    .from('realtors')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Realtor | null;
}

export interface CreateRealtorData {
  full_name: string;
  email: string;
  phone?: string;
  brokerage?: string;
  bio?: string;
  headshot_url?: string;
  brokerage_logo_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  website_url?: string;
}

export async function createRealtor(
  photographerId: string,
  data: CreateRealtorData
): Promise<Realtor> {
  const { data: realtor, error } = await supabase
    .from('realtors')
    .insert({
      created_by: photographerId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      brokerage: data.brokerage || null,
      bio: data.bio || null,
      headshot_url: data.headshot_url || null,
      brokerage_logo_url: data.brokerage_logo_url || null,
      instagram_url: data.instagram_url || null,
      linkedin_url: data.linkedin_url || null,
      website_url: data.website_url || null,
    } as never)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: your account may not have the photographer role assigned. Contact an administrator.');
    }
    if (error.code === '23505') {
      throw new Error('A realtor with this email already exists.');
    }
    throw new Error(error.message || 'Failed to create realtor');
  }
  return realtor as unknown as Realtor;
}

export async function updateRealtor(
  id: string,
  data: Partial<CreateRealtorData>
): Promise<Realtor> {
  const { data: realtor, error } = await supabase
    .from('realtors')
    .update(data as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: you do not have access to update this realtor.');
    }
    throw new Error(error.message || 'Failed to update realtor');
  }
  return realtor as unknown as Realtor;
}

export async function archiveRealtor(id: string): Promise<void> {
  const { error } = await supabase
    .from('realtors')
    .update({ is_archived: true } as never)
    .eq('id', id);

  if (error) throw error;
}

export async function unarchiveRealtor(id: string): Promise<void> {
  const { error } = await supabase
    .from('realtors')
    .update({ is_archived: false } as never)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteRealtor(id: string): Promise<void> {
  const { error } = await supabase
    .from('realtors')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: you do not have access to delete this realtor.');
    }
    if (error.code === '23503') {
      throw new Error('Cannot delete this realtor because they are still referenced by other records.');
    }
    throw new Error(error.message || 'Failed to delete realtor');
  }
}

export async function checkRealtorEmailUniqueness(
  email: string,
  _photographerId: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('realtors')
    .select('id')
    .eq('email', email);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query.maybeSingle();
  return !data;
}
