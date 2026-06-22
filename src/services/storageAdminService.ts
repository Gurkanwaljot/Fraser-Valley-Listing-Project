import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
}

async function callR2Admin<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/r2-admin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `R2 admin request failed (${response.status})`);
  }

  return response.json();
}

export interface S3Object {
  key: string;
  size: number;
  last_modified: string;
}

export interface ListObjectsResult {
  objects: S3Object[];
  isTruncated: boolean;
  nextToken: string | null;
}

export interface BucketStats {
  total_size: number;
  total_count: number;
  quota_bytes: number;
  breakdown: Record<string, { count: number; size: number }>;
}

export interface MultipartUpload {
  key: string;
  uploadId: string;
  initiated: string;
}

export interface MultipartUploadsResult {
  uploads: MultipartUpload[];
  count: number;
}

export interface AbortStaleResult {
  total_found: number;
  stale_count: number;
  aborted: number;
  failed: number;
}

export interface OrphanResult {
  total_r2_files: number;
  total_db_keys: number;
  orphan_count: number;
  orphan_size: number;
  orphans: S3Object[];
}

export interface ListingStorageItem {
  id: string;
  title: string;
  slug: string;
  storage_size: number;
  file_count: number;
}

export interface ListingStorageResult {
  listings: ListingStorageItem[];
}

export interface DeleteListingStorageResult {
  deleted: number;
  failed: number;
  listing_id: string;
}

export async function getStorageStats(): Promise<BucketStats> {
  return callR2Admin<BucketStats>({ action: 'get-bucket-stats' });
}

export async function listObjects(prefix?: string, continuationToken?: string): Promise<ListObjectsResult> {
  return callR2Admin<ListObjectsResult>({
    action: 'list-objects',
    prefix,
    continuation_token: continuationToken,
  });
}

export async function deleteObject(key: string): Promise<{ success: boolean; key: string }> {
  return callR2Admin<{ success: boolean; key: string }>({ action: 'delete-object', key });
}

export async function deletePrefix(prefix: string): Promise<{ deleted: number; failed: number; prefix: string }> {
  return callR2Admin<{ deleted: number; failed: number; prefix: string }>({ action: 'delete-prefix', prefix });
}

export async function listMultipartUploads(): Promise<MultipartUploadsResult> {
  return callR2Admin<MultipartUploadsResult>({ action: 'list-multipart-uploads' });
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<{ success: boolean }> {
  return callR2Admin<{ success: boolean }>({ action: 'abort-multipart-upload', key, upload_id: uploadId });
}

export async function abortAllStaleMultiparts(maxAgeMs?: number): Promise<AbortStaleResult> {
  return callR2Admin<AbortStaleResult>({ action: 'abort-all-stale-multiparts', max_age_ms: maxAgeMs });
}

export async function findOrphans(): Promise<OrphanResult> {
  return callR2Admin<OrphanResult>({ action: 'find-orphans' });
}

export async function getListingStorage(): Promise<ListingStorageResult> {
  return callR2Admin<ListingStorageResult>({ action: 'get-listing-storage' });
}

export async function deleteListingStorage(listingId: string): Promise<DeleteListingStorageResult> {
  return callR2Admin<DeleteListingStorageResult>({ action: 'delete-listing-storage', listing_id: listingId });
}
