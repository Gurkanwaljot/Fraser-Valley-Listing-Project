import { supabase } from '../lib/supabase';
import type { DownloadCategory } from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? SUPABASE_ANON_KEY;
}

export interface StreamManifestFile {
  path: string;
  signedUrl: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StreamManifest {
  runToken: string;
  zipFilename: string;
  expectedBytes: number;
  expectedFileCount: number;
  files: StreamManifestFile[];
}

export async function requestStreamManifest(
  listingId: string,
  kind: DownloadCategory,
  shareToken?: string,
): Promise<StreamManifest> {
  const token = await getAuthToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/prepare-stream-download`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      kind,
      share_token: shareToken,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Stream prepare failed (${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw new Error('Stream manifest empty');
  }
  return {
    runToken: data.run_token,
    zipFilename: data.zip_filename,
    expectedBytes: data.expected_bytes ?? 0,
    expectedFileCount: data.expected_file_count ?? data.files.length,
    files: data.files.map((f: { path: string; signed_url: string; size_bytes: number; mime_type: string }) => ({
      path: f.path,
      signedUrl: f.signed_url,
      sizeBytes: f.size_bytes,
      mimeType: f.mime_type,
    })),
  };
}

export async function recordStreamRun(params: {
  runToken: string;
  status: 'success' | 'error' | 'cancelled';
  bytesDelivered: number;
  filesDelivered: number;
  errorMessage?: string;
}): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/record-stream-run`;
  const payload = {
    run_token: params.runToken,
    status: params.status,
    bytes_delivered: params.bytesDelivered,
    files_delivered: params.filesDelivered,
    error_message: params.errorMessage,
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // best effort
  }
}

export function recordStreamRunBeacon(params: {
  runToken: string;
  status: 'success' | 'error' | 'cancelled';
  bytesDelivered: number;
  filesDelivered: number;
  errorMessage?: string;
}): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    void recordStreamRun(params);
    return;
  }
  const url = `${SUPABASE_URL}/functions/v1/record-stream-run`;
  const payload = JSON.stringify({
    run_token: params.runToken,
    status: params.status,
    bytes_delivered: params.bytesDelivered,
    files_delivered: params.filesDelivered,
    error_message: params.errorMessage,
  });
  try {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
  } catch {
    void recordStreamRun(params);
  }
}
