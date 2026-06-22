import { domToBlob } from 'modern-screenshot';

const dataUrlCache = new Map<string, string>();
const FETCH_TIMEOUT_MS = 15000;

async function urlToDataUrl(url: string): Promise<string> {
  if (!url) throw new Error('Empty URL');
  const cached = dataUrlCache.get(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } finally {
    clearTimeout(timer);
  }
}

export async function preloadImagesAsDataUrls(urls: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      if (url.startsWith('data:')) {
        map.set(url, url);
        return;
      }
      try {
        const dataUrl = await urlToDataUrl(url);
        map.set(url, dataUrl);
      } catch {
        // Leave it out — caller will fall back to the original URL
      }
    }),
  );
  return map;
}

export interface AssetCandidate {
  id: string;
  urls: string[];
}

export async function preloadBrochureAssets(assets: AssetCandidate[], extraUrls: string[] = []): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  await Promise.all(
    assets.map(async ({ id, urls }) => {
      for (const url of urls) {
        if (!url) continue;
        if (url.startsWith('data:')) {
          map.set(id, url);
          return;
        }
        try {
          const dataUrl = await urlToDataUrl(url);
          map.set(id, dataUrl);
          return;
        } catch {
          // try next candidate
        }
      }
    }),
  );

  await Promise.all(
    extraUrls.filter(Boolean).map(async (url) => {
      if (url.startsWith('data:')) {
        map.set(url, url);
        return;
      }
      try {
        const dataUrl = await urlToDataUrl(url);
        map.set(url, dataUrl);
      } catch {
        // skip
      }
    }),
  );

  return map;
}

interface ExportOptions {
  filename: string;
  scale?: number;
  backgroundColor?: string;
}

export async function exportNodeToPng(node: HTMLElement, opts: ExportOptions): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts && 'ready' in document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const width = node.offsetWidth;
  const height = node.offsetHeight;

  const blob = await domToBlob(node, {
    scale: opts.scale ?? 2,
    width,
    height,
    type: 'image/png',
    quality: 1,
    backgroundColor: opts.backgroundColor,
    style: { position: 'static', left: '0', top: '0', margin: '0', transform: 'none' },
    fetch: { requestInit: { mode: 'cors' } },
  });

  if (!blob) throw new Error('Failed to rasterize node');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
