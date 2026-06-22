import { supabase } from '../lib/supabase';
import { requestUploadUrl, uploadToR2, deleteFromStorage } from '../lib/storage';
import type { UploadProgressEvent } from '../lib/storage';
import type { MediaAsset, MediaKind } from '../types/database';

export interface MediaUploadParams {
  file: File;
  listingId: string;
  kind: MediaKind;
  uploadedBy: string;
  thumbnailBlob?: Blob | null;
  largeBlob?: Blob | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  sortOrder?: number;
  onProgress?: (event: UploadProgressEvent) => void;
  abortSignal?: AbortSignal;
}

function media() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('media_assets') as any;
}

export async function getMediaForListing(listingId: string): Promise<MediaAsset[]> {
  const { data, error } = await media()
    .select('*')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function uploadMediaFile(params: MediaUploadParams): Promise<MediaAsset> {
  const { file, listingId, kind, uploadedBy, thumbnailBlob, largeBlob, width, height, durationSeconds, sortOrder, onProgress, abortSignal } = params;

  const result = await requestUploadUrl(file, listingId);
  await uploadToR2(result.uploadUrl, file, onProgress, abortSignal);

  let thumbnailUrl: string | null = null;
  if (thumbnailBlob) {
    const suffix = kind === 'video' ? '-poster.webp' : '-thumb.webp';
    const thumbFilename = file.name.replace(/\.[^.]+$/, suffix);
    const thumbFile = new File([thumbnailBlob], thumbFilename, { type: 'image/webp' });
    const thumbResult = await requestUploadUrl(thumbFile, listingId);
    await uploadToR2(thumbResult.uploadUrl, thumbFile);
    thumbnailUrl = thumbResult.publicUrl;
  }

  let largeUrl: string | null = null;
  if (largeBlob) {
    const largeFilename = file.name.replace(/\.[^.]+$/, '-large.webp');
    const largeFile = new File([largeBlob], largeFilename, { type: 'image/webp' });
    const largeResult = await requestUploadUrl(largeFile, listingId);
    await uploadToR2(largeResult.uploadUrl, largeFile);
    largeUrl = largeResult.publicUrl;
  }

  let nextOrder: number;
  if (sortOrder !== undefined) {
    nextOrder = sortOrder;
  } else {
    const { data: maxOrder } = await media()
      .select('sort_order')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    nextOrder = ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1;
  }

  const { data, error } = await media()
    .insert({
      listing_id: listingId,
      uploaded_by: uploadedBy,
      kind,
      storage_provider: 'cloudflare_r2',
      bucket: result.bucket,
      original_key: result.key,
      public_url: result.publicUrl,
      thumbnail_url: kind !== 'video' ? thumbnailUrl : null,
      poster_url: kind === 'video' ? thumbnailUrl : null,
      large_url: largeUrl,
      filename_original: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
      width: width ?? null,
      height: height ?? null,
      duration_seconds: durationSeconds ?? null,
      sort_order: nextOrder,
      is_hero: false,
      is_public: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function getMaxSortOrder(listingId: string): Promise<number> {
  const { data } = await media()
    .select('sort_order')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { sort_order: number } | null)?.sort_order ?? -1;
}

export async function deleteMediaAsset(id: string, key: string, thumbnailKey?: string): Promise<void> {
  await deleteFromStorage(key);
  if (thumbnailKey) {
    await deleteFromStorage(thumbnailKey).catch(() => {});
  }
  const { error } = await media().delete().eq('id', id);
  if (error) throw error;
}

export async function updateMediaAsset(
  id: string,
  fields: { caption?: string | null; alt_text?: string | null; is_public?: boolean; kind?: string }
): Promise<MediaAsset> {
  const { data, error } = await media()
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function reorderMedia(listingId: string, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    media()
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('listing_id', listingId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r: { error: unknown }) => r.error);
  if (failed?.error) throw failed.error;
}

export async function setHeroImage(listingId: string, mediaId: string): Promise<void> {
  const { error: clearError } = await media()
    .update({ is_hero: false, updated_at: new Date().toISOString() })
    .eq('listing_id', listingId)
    .eq('is_hero', true);

  if (clearError) throw clearError;

  const { error: setError } = await media()
    .update({ is_hero: true, updated_at: new Date().toISOString() })
    .eq('id', mediaId);

  if (setError) throw setError;
}

export async function updatePosterUrl(id: string, posterUrl: string, oldPosterKey?: string): Promise<MediaAsset> {
  if (oldPosterKey) {
    await deleteFromStorage(oldPosterKey).catch(() => {});
  }
  const { data, error } = await media()
    .update({ poster_url: posterUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function getHeroMedia(listingId: string): Promise<MediaAsset | null> {
  const { data, error } = await media()
    .select('*')
    .eq('listing_id', listingId)
    .eq('is_hero', true)
    .maybeSingle();
  if (error) throw error;
  return data as MediaAsset | null;
}

export interface MediaSummary {
  photos: number;
  videos: number;
  floorPlans: number;
  documents: number;
  totalSizeBytes: number;
}

export async function getMediaSummary(listingId: string): Promise<MediaSummary> {
  const { data, error } = await media()
    .select('kind, file_size_bytes')
    .eq('listing_id', listingId)
    .eq('is_public', true);

  if (error) throw error;

  const summary: MediaSummary = { photos: 0, videos: 0, floorPlans: 0, documents: 0, totalSizeBytes: 0 };
  for (const row of (data ?? []) as { kind: MediaKind; file_size_bytes: number }[]) {
    summary.totalSizeBytes += row.file_size_bytes ?? 0;
    if (row.kind === 'photo') summary.photos++;
    else if (row.kind === 'video') summary.videos++;
    else if (row.kind === 'floor_plan') summary.floorPlans++;
    else if (row.kind === 'document') summary.documents++;
  }
  return summary;
}

export async function getHeroMediaBatch(listingIds: string[]): Promise<Record<string, string>> {
  if (listingIds.length === 0) return {};
  const { data, error } = await media()
    .select('listing_id, public_url, thumbnail_url')
    .in('listing_id', listingIds)
    .eq('is_hero', true);
  if (error) throw error;
  return Object.fromEntries(
    ((data ?? []) as { listing_id: string; public_url: string | null; thumbnail_url: string | null }[])
      .map((m) => [m.listing_id, m.thumbnail_url || m.public_url || ''])
      .filter(([, url]) => url)
  );
}
