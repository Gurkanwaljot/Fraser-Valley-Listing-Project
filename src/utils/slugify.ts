import { supabase } from '../lib/supabase';

export function generateSlug(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function checkSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('listings').select('id').eq('slug', slug);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data } = await query.maybeSingle();
  return !data;
}

export async function generateUniqueSlug(address: string, excludeId?: string): Promise<string> {
  const base = generateSlug(address);
  let slug = base;
  let counter = 1;

  while (!(await checkSlugUniqueness(slug, excludeId))) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}
