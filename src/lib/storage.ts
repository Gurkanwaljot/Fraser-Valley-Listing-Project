import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string | null;
  bucket: string;
  contentType: string;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
}

export async function requestUploadUrl(
  file: File,
  listingId: string
): Promise<PresignedUploadResult> {
  const token = await getAuthToken();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/storage-upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      listingId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to get upload URL');
  }

  return response.json();
}

export function uploadToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (event: UploadProgressEvent) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload aborted', 'AbortError'));
      });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

export async function deleteFromStorage(key: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/storage-delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to delete file');
  }
}

export async function requestDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const token = await getAuthToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/storage-download`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, expiresIn }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to get download URL');
  }

  const data = await response.json();
  return data.url;
}
