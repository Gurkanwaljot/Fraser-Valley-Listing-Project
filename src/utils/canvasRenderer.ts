import QRCode from 'qrcode';

const imageCache = new Map<string, HTMLImageElement>();
const LOAD_TIMEOUT_MS = 12000;
const RETRY_DELAY_MS = 1500;

export const PREVIEW_SCALE = 2;
export const EXPORT_SCALE = 4;

// --- IMAGE LOADING (RELIABLE) ---

export async function loadImage(url: string): Promise<HTMLImageElement> {
  if (!url) return Promise.reject(new Error('Empty image URL'));
  const cached = imageCache.get(url);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new Error(`Image load timed out: ${url.slice(0, 80)}`));
    }, LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timer);
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      img.src = '';
      reject(new Error(`Failed to load image: ${url.slice(0, 80)}`));
    };
    img.src = url;
  });
}

async function loadImageWithRetry(url: string): Promise<HTMLImageElement> {
  try {
    return await loadImage(url);
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return loadImage(url);
  }
}

export interface LoadPhotosResult {
  images: (HTMLImageElement | null)[];
  loaded: number;
  total: number;
}

export async function loadPhotosParallel(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<LoadPhotosResult> {
  const total = urls.length;
  let loaded = 0;

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      if (!url) return null;
      const img = await loadImageWithRetry(url);
      loaded++;
      onProgress?.(loaded, total);
      return img;
    })
  );

  const images = results.map((r) =>
    r.status === 'fulfilled' ? r.value : null
  );

  return {
    images,
    loaded: images.filter(Boolean).length,
    total,
  };
}

export function clearImageCache() {
  imageCache.clear();
}

// --- DESIGN TOKENS ---

export const BRAND_COLORS = {
  gold: '#C8A45D',
  goldLight: '#E8C87A',
  goldMid: '#C8A45D',
  goldDark: '#9A7A30',
  dark: '#050505',
  surface: '#111111',
  surfaceLight: '#1a1a1a',
  warmWhite: '#F7F3EA',
  textPrimary: '#F7F3EA',
  textSecondary: '#A8A29E',
  white: '#FFFFFF',
  black: '#000000',
  error: '#EF4444',
  success: '#22C55E',
  red: '#B91C1C',
  redTop: '#B4232A',
  redBottom: '#6E0F16',
  redBadge: '#9B1C1C',
  hairline: 'rgba(247,243,234,0.14)',
} as const;

export const TYPOGRAPHY = {
  price: { size: 64, weight: 700, tracking: -1 },
  priceStory: { size: 72, weight: 700, tracking: -1 },
  address: { size: 22, weight: 500, tracking: 3 },
  addressStory: { size: 26, weight: 500, tracking: 3 },
  stats: { size: 20, weight: 400, tracking: 1 },
  statsStory: { size: 22, weight: 400, tracking: 1 },
  badge: { size: 18, weight: 700, tracking: 4 },
  agentName: { size: 22, weight: 700, tracking: 1 },
  agentBrokerage: { size: 16, weight: 400, tracking: 0 },
  agentPhone: { size: 15, weight: 400, tracking: 0 },
} as const;

// --- CANVAS CREATION ---

export function createCanvas(width: number, height: number, scale = PREVIEW_SCALE): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      type,
      quality
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- TYPOGRAPHY ENGINE ---

export function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight: number,
  family = "'Hanken Grotesk', sans-serif"
): number {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

export function wrapTextByWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + '\u2026').width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = last + '\u2026';
  }

  return lines;
}

export function getTextMetrics(ctx: CanvasRenderingContext2D, text: string) {
  const m = ctx.measureText(text);
  return {
    width: m.width,
    ascent: m.actualBoundingBoxAscent,
    descent: m.actualBoundingBoxDescent,
    height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
  };
}

// --- RICH TEXT RENDERING (MULTI-LAYER SHADOWS) ---

export function drawRichText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string
) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// --- DRAWING UTILITIES ---

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.closePath();
}

export function drawTextWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

// --- MULTI-LAYER GRADIENTS ---

export function drawLuxuryOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity = 1.0
) {
  // Bottom cinematic gradient
  const bottom = ctx.createLinearGradient(x, y + h * 0.38, x, y + h);
  bottom.addColorStop(0, 'rgba(5,5,5,0)');
  bottom.addColorStop(0.4, `rgba(5,5,5,${0.3 * intensity})`);
  bottom.addColorStop(0.65, `rgba(5,5,5,${0.6 * intensity})`);
  bottom.addColorStop(0.85, `rgba(5,5,5,${0.85 * intensity})`);
  bottom.addColorStop(1, `rgba(5,5,5,${0.95 * intensity})`);
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y, w, h);

  // Radial shadow behind text area (lower-left)
  const radial = ctx.createRadialGradient(
    x + w * 0.2, y + h * 0.75, 20,
    x + w * 0.2, y + h * 0.75, w * 0.5
  );
  radial.addColorStop(0, `rgba(5,5,5,${0.5 * intensity})`);
  radial.addColorStop(1, 'rgba(5,5,5,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(x, y, w, h);

  // Top subtle gradient for badge readability
  const top = ctx.createLinearGradient(x, y, x, y + h * 0.2);
  top.addColorStop(0, `rgba(5,5,5,${0.4 * intensity})`);
  top.addColorStop(1, 'rgba(5,5,5,0)');
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, h);
}

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength = 0.35
) {
  const rad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.82);
  rad.addColorStop(0, 'rgba(0,0,0,0)');
  rad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);
}

// Keep legacy name for backward compat
export function drawBottomGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  startRatio = 0.4
) {
  drawLuxuryOverlay(ctx, x, y, w, h, startRatio > 0.4 ? 1.1 : 1.0);
}

// --- GOLD DIVIDER WITH GLOW ---

export function drawGoldDivider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width = 3
) {
  // Outer glow
  const glow = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
  glow.addColorStop(0, 'rgba(200,164,93,0)');
  glow.addColorStop(0.5, 'rgba(200,164,93,0.18)');
  glow.addColorStop(1, 'rgba(200,164,93,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 5, y, 10, height);

  // Core line
  ctx.fillStyle = `rgba(200,164,93,0.85)`;
  ctx.fillRect(x - width / 2, y, width, height);
}

// --- IMAGE GRADING ---

export function applyPhotoGrade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  role: 'hero' | 'side'
) {
  if (role === 'hero') {
    // Warm overlay
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255,235,190,0.06)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else {
    // Slight darkening for side photos
    ctx.fillStyle = 'rgba(5,5,5,0.12)';
    ctx.fillRect(x, y, w, h);
  }
}

// --- GRAIN TEXTURE ---

let grainCanvas: HTMLCanvasElement | null = null;

function getGrainCanvas(w: number, h: number): HTMLCanvasElement {
  if (grainCanvas && grainCanvas.width === w && grainCanvas.height === h) {
    return grainCanvas;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const gctx = canvas.getContext('2d')!;
  const imageData = gctx.createImageData(w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() - 0.5) * 25;
    data[i] = 128 + v;
    data[i + 1] = 128 + v;
    data[i + 2] = 128 + v;
    data[i + 3] = 10;
  }
  gctx.putImageData(imageData, 0, 0);
  grainCanvas = canvas;
  return canvas;
}

export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grain = getGrainCanvas(w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grain, 0, 0, w, h);
  ctx.restore();
}

// --- STATUS BADGE (POLISHED) ---

export function drawStatusBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  fontSize: number,
  style: 'gold' | 'red'
) {
  ctx.font = `bold ${fontSize}px 'Hanken Grotesk', sans-serif`;
  ctx.letterSpacing = '4px';
  const metrics = ctx.measureText(text);
  ctx.letterSpacing = '0px';

  const padX = fontSize * 1.4;
  const padY = fontSize * 0.6;
  const w = metrics.width + padX * 2 + text.length * 4;
  const h = fontSize + padY * 2;
  const r = 10;
  const bx = centerX - w / 2;

  if (style === 'red') {
    // Red gradient background
    const redGrad = ctx.createLinearGradient(bx, y, bx, y + h);
    redGrad.addColorStop(0, BRAND_COLORS.redTop);
    redGrad.addColorStop(1, BRAND_COLORS.redBottom);
    ctx.fillStyle = redGrad;
    ctx.beginPath();
    ctx.roundRect(bx, y, w, h, r);
    ctx.fill();

    // Gold border at reduced opacity
    ctx.strokeStyle = 'rgba(200,164,93,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = BRAND_COLORS.white;
  } else {
    // Dark translucent background
    ctx.fillStyle = 'rgba(15,15,15,0.70)';
    ctx.beginPath();
    ctx.roundRect(bx, y, w, h, r);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = BRAND_COLORS.gold;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = BRAND_COLORS.gold;
  }

  ctx.font = `bold ${fontSize}px 'Hanken Grotesk', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';
  ctx.fillText(text, centerX, y + h / 2);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// --- CONFETTI (CORNER-CLUSTERED) ---

export function drawConfettiParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  density = 80
) {
  const seed = 42;
  const rng = (i: number) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < density; i++) {
    // Cluster in corners (70% in edges, 30% center)
    let px: number;
    if (rng(i + 500) < 0.7) {
      px = rng(i) < 0.5
        ? rng(i) * w * 0.25
        : w - rng(i) * w * 0.25;
    } else {
      px = rng(i) * w;
    }
    const py = rng(i + 100) * h * 0.4;
    const size = 1 + rng(i + 200) * 3.5;
    const opacity = 0.25 + rng(i + 300) * 0.6;

    ctx.fillStyle = `rgba(200, 164, 93, ${opacity})`;

    const type = rng(i + 400);
    if (type > 0.7) {
      // Dot
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (type > 0.3) {
      // Star
      drawStar(ctx, px, py, size * 1.5, opacity);
    } else {
      // Angled stroke
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rng(i + 600) * Math.PI);
      ctx.fillRect(-size * 1.5, -0.5, size * 3, 1.5);
      ctx.restore();
    }
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  opacity: number
) {
  ctx.fillStyle = `rgba(200, 164, 93, ${opacity})`;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const x1 = cx + Math.cos(angle) * size;
    const y1 = cy + Math.sin(angle) * size;
    const x2 = cx + Math.cos(angle + Math.PI / 4) * size * 0.3;
    const y2 = cy + Math.sin(angle + Math.PI / 4) * size * 0.3;
    if (i === 0) ctx.moveTo(x1, y1);
    else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fill();
}

// --- HEADSHOT WITH GLOW RING ---

export function drawGoldRingHeadshot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  radius: number
) {
  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();

  // Photo clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  drawImageCover(ctx, img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,164,93,0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Gold ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = BRAND_COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// --- PHONE ICON ---

export function drawPhoneIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(x + s * 0.2, y + s * 0.05);
  ctx.quadraticCurveTo(x + s * 0.35, y + s * 0.05, x + s * 0.4, y + s * 0.2);
  ctx.lineTo(x + s * 0.3, y + s * 0.4);
  ctx.quadraticCurveTo(x + s * 0.45, y + s * 0.55, x + s * 0.6, y + s * 0.7);
  ctx.lineTo(x + s * 0.8, y + s * 0.6);
  ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.65, x + s * 0.95, y + s * 0.8);
  ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.95, x + s * 0.75, y + s * 0.95);
  ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.9, x + s * 0.05, y + s * 0.25);
  ctx.quadraticCurveTo(x + s * 0.05, y + s * 0.05, x + s * 0.2, y + s * 0.05);
  ctx.closePath();
  ctx.fill();
}

// --- FONT LOADING ---

export async function loadFont(family: string, url: string, weight = '400'): Promise<void> {
  const font = new FontFace(family, `url(${url})`, { weight });
  await font.load();
  document.fonts.add(font);
}

export async function ensureFontsLoaded(): Promise<void> {
  await document.fonts.ready;
}

// --- QR CODE GENERATION ---

export async function generateQRCodeImage(url: string, size = 200): Promise<HTMLImageElement> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
  return loadImage(dataUrl);
}

export function drawQRCode(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number
) {
  const pad = 6;
  const totalSize = size + pad * 2;

  ctx.fillStyle = BRAND_COLORS.white;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad, totalSize, totalSize, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(200,164,93,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.drawImage(img, x, y, size, size);
}
