import { supabase } from '../lib/supabase';

export interface PropertyFeature {
  id: string;
  name: string;
  usage_count: number;
}

export async function getFeatureSuggestions(): Promise<PropertyFeature[]> {
  const { data, error } = await supabase
    .from('property_features')
    .select('id, name, usage_count')
    .order('usage_count', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function syncFeatures(features: string[]): Promise<void> {
  if (features.length === 0) return;

  for (const name of features) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) continue;

    const { error: insertError } = await supabase
      .from('property_features' as never)
      .insert({ name: trimmed, usage_count: 1 } as never);

    if (insertError && insertError.code === '23505') {
      await supabase.rpc('increment_feature_usage' as never, { feature_name: trimmed } as never);
    }
  }
}
