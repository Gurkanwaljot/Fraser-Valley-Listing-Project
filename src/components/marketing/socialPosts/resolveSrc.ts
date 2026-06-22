import type { MediaAsset } from '../../../types/database';

export function resolveSrc(photos: MediaAsset[], imageMap: Map<string, string>, idx: number): string {
  const photo = photos[idx];
  if (!photo) return '';
  const key = photo.public_url || photo.large_url || '';
  return imageMap.get(key) || photo.public_url || photo.large_url || '';
}
