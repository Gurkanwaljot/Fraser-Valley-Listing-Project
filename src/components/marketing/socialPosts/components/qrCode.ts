import QRCode from 'qrcode';

const cache = new Map<string, string>();

export async function generateQrDataUrl(
  url: string,
  options?: { size?: number; dark?: string; light?: string },
): Promise<string> {
  const size = options?.size ?? 320;
  const dark = options?.dark ?? '#000000';
  const light = options?.light ?? '#FFFFFF';
  const key = `${url}|${size}|${dark}|${light}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'Q',
    margin: 1,
    width: size,
    color: { dark, light },
  });
  cache.set(key, dataUrl);
  return dataUrl;
}

export function buildListingShareUrl(slug: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/listing/${slug}`;
}
