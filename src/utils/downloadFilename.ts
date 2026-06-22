import type { MediaKind } from '../types/database';

const KIND_LABELS: Record<MediaKind, string> = {
  photo: 'photo',
  video: 'video',
  floor_plan: 'floorplan',
  document: 'doc',
};

function sanitizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot) : '';
}

export function buildDownloadFilename(
  address: string,
  kind: MediaKind,
  index: number,
  originalFilename: string,
): string {
  const slug = sanitizeAddress(address);
  const kindLabel = KIND_LABELS[kind];
  const num = String(index + 1).padStart(2, '0');
  const ext = getExtension(originalFilename);
  return `${slug}-${kindLabel}-${num}${ext}`;
}

export function buildZipFilename(address: string, kind: MediaKind, part?: number): string {
  const slug = sanitizeAddress(address);
  const kindLabel = KIND_LABELS[kind];
  const suffix = part != null ? `-part${part}` : '';
  return `${slug}-${kindLabel}s${suffix}.zip`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
