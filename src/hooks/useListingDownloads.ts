import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DownloadLogEntry {
  id: string;
  listing_id: string;
  realtor_id: string | null;
  user_id: string | null;
  media_asset_id: string | null;
  download_type: 'single' | 'bulk_zip';
  asset_ids: string[] | null;
  file_count: number | null;
  total_size_bytes: number | null;
  status: 'success' | 'failed' | 'partial';
  failure_reason: string | null;
  created_at: string;
  realtor_name: string | null;
  realtor_email: string | null;
}

export interface DownloadSummary {
  totalDownloads: number;
  totalFiles: number;
  uniqueRealtors: number;
  lastDownload: string | null;
  successCount: number;
  failedCount: number;
  partialCount: number;
}

async function getListingDownloads(listingId: string): Promise<DownloadLogEntry[]> {
  const { data, error } = await supabase
    .from('download_logs')
    .select(`
      id,
      listing_id,
      realtor_id,
      user_id,
      media_asset_id,
      download_type,
      asset_ids,
      file_count,
      total_size_bytes,
      status,
      failure_reason,
      created_at,
      realtors(full_name, email)
    `)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const realtor = row.realtors as { full_name: string; email: string } | null;
    return {
      id: row.id as string,
      listing_id: row.listing_id as string,
      realtor_id: row.realtor_id as string | null,
      user_id: row.user_id as string | null,
      media_asset_id: row.media_asset_id as string | null,
      download_type: row.download_type as 'single' | 'bulk_zip',
      asset_ids: row.asset_ids as string[] | null,
      file_count: row.file_count as number | null,
      total_size_bytes: row.total_size_bytes as number | null,
      status: (row.status as string) || 'success',
      failure_reason: row.failure_reason as string | null,
      created_at: row.created_at as string,
      realtor_name: realtor?.full_name || null,
      realtor_email: realtor?.email || null,
    } as DownloadLogEntry;
  });
}

export function useListingDownloads(listingId: string | undefined) {
  return useQuery({
    queryKey: ['listing-downloads', listingId],
    queryFn: () => getListingDownloads(listingId!),
    enabled: !!listingId,
  });
}

export function useDownloadSummary(downloads: DownloadLogEntry[] | undefined): DownloadSummary {
  if (!downloads || downloads.length === 0) {
    return { totalDownloads: 0, totalFiles: 0, uniqueRealtors: 0, lastDownload: null, successCount: 0, failedCount: 0, partialCount: 0 };
  }

  const realtorIds = new Set(downloads.filter((d) => d.realtor_id).map((d) => d.realtor_id));
  const totalFiles = downloads.reduce((sum, d) => sum + (d.file_count || 0), 0);
  const successCount = downloads.filter((d) => d.status === 'success').length;
  const failedCount = downloads.filter((d) => d.status === 'failed').length;
  const partialCount = downloads.filter((d) => d.status === 'partial').length;

  return {
    totalDownloads: downloads.length,
    totalFiles,
    uniqueRealtors: realtorIds.size,
    lastDownload: downloads[0]?.created_at || null,
    successCount,
    failedCount,
    partialCount,
  };
}
