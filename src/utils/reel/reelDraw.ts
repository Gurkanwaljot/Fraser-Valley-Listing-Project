import '@fontsource/fraunces/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';

import type { ReelScene, PhotoSegment, Segment } from './reelScene';
import { drawGoldRingHeadshot, drawQRCode, fitTextToWidth } from '../canvasRenderer';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Ctx2D = CanvasRenderingContext2D;

const FONT_SYNE = '"Syne", sans-serif';
const FONT_FRAUNCES = '"Fraunces", serif';
const FONT_JOST = '"Jost", sans-serif';

export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

export async function loadReelFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('600 100px "Fraunces"'),
    document.fonts.load('700 100px "Syne"'),
    document.fonts.load('800 100px "Syne"'),
    document.fonts.load('400 100px "Jost"'),
    document.fonts.load('500 100px "Jost"'),
    document.fonts.load('600 100px "Jost"'),
  ]);
  await document.fonts.ready;
}

const easeInOut = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function dissolveAlpha(seg: Segment, t: number, transition: number): number {
  const fadeIn = Math.min(1, (t - seg.start) / transition);
  const fadeOut = Math.min(1, (seg.end - t) / transition);
  return Math.min(fadeIn, fadeOut);
}

export function drawReelFrame(
  ctx: Ctx,
  scene: ReelScene,
  t: number,
  imgs: Map<string, HTMLImageElement | ImageBitmap>,
  headshot: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  qr: HTMLImageElement | null,
) {
  const { width: W, height: H } = scene;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const active = scene.segments.filter(s => t >= s.start && t < s.end);
  if (active.length === 0 && t >= scene.durationSec) {
    drawOutro(ctx, scene, 1, headshot, logo, qr);
    return;
  }

  let topmostPhoto: PhotoSegment | null = null;

  for (const seg of active) {
    const segDuration = seg.end - seg.start;
    const local = Math.max(0, Math.min(1, (t - seg.start) / segDuration));
    const alpha = dissolveAlpha(seg, t, scene.tempo.transition);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    if (seg.kind === 'photo') {
      drawPhotoSegment(ctx, scene, seg, local, imgs);
      topmostPhoto = seg;
    } else {
      drawOutro(ctx, scene, local, headshot, logo, qr);
    }
    ctx.restore();
  }

  // Fix 3: fade overlay out as outro fades in
  const outroSeg = active.find(s => s.kind === 'outro');
  let overlayAlpha = 1;
  if (outroSeg) {
    const outroIn = Math.min(1, (t - outroSeg.start) / scene.tempo.transition);
    overlayAlpha = 1 - outroIn;
  }

  if (topmostPhoto && overlayAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = overlayAlpha;
    drawOverlay(ctx, scene, topmostPhoto);
    ctx.restore();
  }
}

function drawPhotoSegment(
  ctx: Ctx,
  scene: ReelScene,
  seg: PhotoSegment,
  local: number,
  imgs: Map<string, HTMLImageElement | ImageBitmap>,
) {
  const img = imgs.get(seg.imageKey);
  if (!img) return;

  const { width: W, height: H } = scene;
  const p = easeInOut(local);

  const imgW = img.width;
  const imgH = img.height;

  const cover = Math.max(W / imgW, H / imgH);
  const range = seg.zoomLed ? scene.tempo.zoomRange : scene.tempo.zoomRange * 0.7;
  const z = (1 + range) - range * p;
  const scale = cover * z;

  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const overflowX = drawW - W;
  const overflowY = drawH - H;

  const panAmt = seg.zoomLed ? scene.tempo.panFrac * 0.6 : scene.tempo.panFrac;
  let dx = -overflowX / 2;
  let dy = -overflowY / 2;

  if (imgW >= imgH) {
    dx += seg.panDir * overflowX * panAmt * (p - 0.5);
  } else {
    dy += seg.panDir * overflowY * panAmt * (p - 0.5);
  }

  ctx.drawImage(img as CanvasImageSource, dx, dy, drawW, drawH);
}

function drawOverlay(
  ctx: Ctx,
  scene: ReelScene,
  seg: PhotoSegment,
) {
  const { width: W, height: H } = scene;

  const grad = ctx.createLinearGradient(0, H * 0.50, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.25, 'rgba(0,0,0,0.20)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0.90)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.18);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.18);

  if (seg.isHero) {
    drawIntroOverlay(ctx, scene);
  } else {
    drawBodyOverlay(ctx, scene);
  }
}

function drawIntroOverlay(
  ctx: Ctx,
  scene: ReelScene,
) {
  const { width: W, height: H, theme } = scene;
  const pad = 72;
  let y = H - 440;

  if (scene.statusHeadline) {
    ctx.font = `800 62px ${FONT_SYNE}`;
    ctx.letterSpacing = '6px';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(scene.statusHeadline, pad, y);
    ctx.letterSpacing = '0px';
    y += 80;
  }

  const addrSize = fitTextToWidth(ctx as Ctx2D, scene.address, W - pad * 2, 64, 40, 600, FONT_FRAUNCES);
  ctx.font = `600 ${addrSize}px ${FONT_FRAUNCES}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(scene.address, pad, y);
  y += addrSize + 14;

  if (scene.addressCity) {
    ctx.font = `500 32px ${FONT_JOST}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(scene.addressCity, pad, y);
    y += 52;
  } else {
    y += 20;
  }

  ctx.font = `500 34px ${FONT_JOST}`;
  ctx.letterSpacing = '2px';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(scene.specs, pad, y);
  ctx.letterSpacing = '0px';

  ctx.globalAlpha = 0.6;
  ctx.font = `600 28px ${FONT_JOST}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  const agentLine = scene.agentBrokerage
    ? `${scene.agentName}  |  ${scene.agentBrokerage}`
    : scene.agentName;
  ctx.fillText(agentLine, W / 2, H - 52);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawBodyOverlay(
  ctx: Ctx,
  scene: ReelScene,
) {
  const { width: W, height: H, theme } = scene;
  const pad = 72;

  if (scene.statusHeadline) {
    const chipY = 80;
    ctx.font = `700 20px ${FONT_SYNE}`;
    ctx.letterSpacing = '3px';
    const chipText = scene.statusHeadline;
    const metrics = ctx.measureText(chipText);
    const chipW = metrics.width + 36 + chipText.length * 3;
    const chipH = 40;
    const chipX = pad;

    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 6);
    ctx.fill();

    ctx.fillStyle = theme.mode === 'dark' ? '#000000' : '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipText, chipX + 18, chipY + chipH / 2);
    ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
  }

  let y = H - 190;
  const addrSize = fitTextToWidth(ctx as Ctx2D, scene.address, W - pad * 2, 48, 30, 600, FONT_FRAUNCES);
  ctx.font = `600 ${addrSize}px ${FONT_FRAUNCES}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(scene.address, pad, y);
  y += addrSize + 8;

  if (scene.addressCity) {
    ctx.font = `500 26px ${FONT_JOST}`;
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.fillText(scene.addressCity, pad, y);
    y += 40;
  } else {
    y += 20;
  }

  ctx.font = `500 26px ${FONT_JOST}`;
  ctx.letterSpacing = '2px';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText(scene.specs, pad, y);
  ctx.letterSpacing = '0px';
}

// --- Outro: block-based vertically centered layout ---

type Block = { h: number; draw: (yTop: number) => void };

function drawOutro(
  ctx: Ctx,
  scene: ReelScene,
  local: number,
  headshot: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  qr: HTMLImageElement | null,
) {
  const { width: W, height: H, theme, outro } = scene;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  const fadeIn = Math.min(1, local * 4);
  ctx.globalAlpha = fadeIn;

  // Inset premium frame
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = fadeIn * 0.3;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.globalAlpha = fadeIn;

  ctx.textAlign = 'center';

  const blocks: Block[] = [];
  const GAP = 26;

  // Block: headshot
  if (headshot) {
    const radius = 150;
    blocks.push({
      h: radius * 2 + 20,
      draw: (yTop) => {
        const cx = W / 2;
        const cy = yTop + radius;
        drawGoldRingHeadshot(ctx as Ctx2D, headshot as HTMLImageElement, cx, cy, radius);
      },
    });
  }

  // Block: name
  const nameSize = fitTextToWidth(ctx as Ctx2D, outro.name, W - 160, 76, 48, 600, FONT_FRAUNCES);
  blocks.push({
    h: nameSize + 8,
    draw: (yTop) => {
      ctx.font = `600 ${nameSize}px ${FONT_FRAUNCES}`;
      ctx.fillStyle = theme.ink;
      ctx.fillText(outro.name, W / 2, yTop + nameSize);
    },
  });

  // Block: phone with small glyph
  const formattedPhone = formatPhone(outro.phone);
  if (formattedPhone) {
    const phoneSize = 42;
    blocks.push({
      h: phoneSize + 8,
      draw: (yTop) => {
        ctx.font = `500 ${phoneSize}px ${FONT_JOST}`;
        ctx.fillStyle = theme.accent;
        const phoneW = ctx.measureText(formattedPhone).width;
        const glyphW = 22;
        const unitW = glyphW + 12 + phoneW;
        const unitLeft = W / 2 - unitW / 2;

        // Phone glyph (static, no animation)
        ctx.save();
        ctx.fillStyle = theme.accent;
        const gx = unitLeft + glyphW / 2;
        const gy = yTop + phoneSize / 2 + 4;
        ctx.beginPath();
        ctx.roundRect(gx - 5, gy - 10, 10, 20, 5);
        ctx.fill();
        ctx.fillRect(gx - 4, gy - 10, 8, 4);
        ctx.fillRect(gx - 4, gy + 6, 8, 4);
        ctx.restore();

        // Phone number
        ctx.textAlign = 'left';
        ctx.fillText(formattedPhone, unitLeft + glyphW + 12, yTop + phoneSize);
        ctx.textAlign = 'center';
      },
    });
  }

  // Block: brokerage
  if (logo) {
    const logoH = 64;
    const logoW = (logo.width / logo.height) * logoH;
    blocks.push({
      h: logoH,
      draw: (yTop) => {
        ctx.drawImage(logo as CanvasImageSource, W / 2 - logoW / 2, yTop, logoW, logoH);
      },
    });
  } else if (scene.agentBrokerage) {
    blocks.push({
      h: 30,
      draw: (yTop) => {
        ctx.font = `700 26px ${FONT_SYNE}`;
        ctx.letterSpacing = '3px';
        ctx.fillStyle = theme.sub;
        ctx.fillText(scene.agentBrokerage.toUpperCase(), W / 2, yTop + 26);
        ctx.letterSpacing = '0px';
      },
    });
  }

  // Block: divider
  blocks.push({
    h: 2,
    draw: (yTop) => {
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = fadeIn * 0.5;
      ctx.fillRect(W / 2 - 45, yTop, 90, 1.5);
      ctx.globalAlpha = fadeIn;
    },
  });

  // Block: address (street + city)
  const streetSize = fitTextToWidth(ctx as Ctx2D, scene.address, W - 160, 38, 26, 500, FONT_JOST);
  const cityText = scene.addressCity || '';
  const citySize = cityText ? fitTextToWidth(ctx as Ctx2D, cityText, W - 160, 28, 20, 400, FONT_JOST) : 0;
  const addrBlockH = streetSize + 6 + (cityText ? citySize + 4 : 0);
  blocks.push({
    h: addrBlockH,
    draw: (yTop) => {
      ctx.font = `500 ${streetSize}px ${FONT_JOST}`;
      ctx.fillStyle = theme.ink;
      ctx.fillText(scene.address, W / 2, yTop + streetSize);
      if (cityText) {
        ctx.font = `400 ${citySize}px ${FONT_JOST}`;
        ctx.fillStyle = theme.sub;
        ctx.globalAlpha = fadeIn * 0.8;
        ctx.fillText(cityText, W / 2, yTop + streetSize + 6 + citySize);
        ctx.globalAlpha = fadeIn;
      }
    },
  });

  // Block: CTA pill
  const ctaText = 'SCHEDULE A PRIVATE SHOWING';
  const ctaFontSize = fitTextToWidth(ctx as Ctx2D, ctaText, 580, 30, 20, 800, FONT_SYNE);
  const ctaPillH = ctaFontSize + 36;
  blocks.push({
    h: ctaPillH,
    draw: (yTop) => {
      ctx.font = `800 ${ctaFontSize}px ${FONT_SYNE}`;
      ctx.letterSpacing = '4px';
      const textW = ctx.measureText(ctaText).width + ctaText.length * 4;
      const pillW = textW + 60;
      const pillH = ctaPillH;
      const pillX = W / 2 - pillW / 2;
      const pillY = yTop;

      // Pulsing border
      const pulse = 0.6 + 0.4 * Math.sin(local * Math.PI * 3);
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.globalAlpha = fadeIn * pulse;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.stroke();
      ctx.globalAlpha = fadeIn;

      // CTA text
      ctx.fillStyle = theme.accent;
      ctx.fillText(ctaText, W / 2, yTop + pillH / 2 + ctaFontSize * 0.35);
      ctx.letterSpacing = '0px';
    },
  });

  // Block: QR
  if (qr) {
    const qrSize = 180;
    blocks.push({
      h: qrSize + 34,
      draw: (yTop) => {
        drawQRCode(ctx as Ctx2D, qr as HTMLImageElement, W / 2 - qrSize / 2, yTop, qrSize);
        ctx.font = `600 18px ${FONT_SYNE}`;
        ctx.letterSpacing = '2px';
        ctx.fillStyle = theme.sub;
        ctx.globalAlpha = fadeIn * 0.7;
        ctx.fillText('SCAN TO VIEW LISTING', W / 2, yTop + qrSize + 28);
        ctx.letterSpacing = '0px';
        ctx.globalAlpha = fadeIn;
      },
    });
  }

  // Vertically center all blocks
  const totalH = blocks.reduce((s, b) => s + b.h, 0) + GAP * (blocks.length - 1);
  let y = Math.max(60, (H - totalH) / 2);
  for (const b of blocks) {
    b.draw(y);
    y += b.h + GAP;
  }

  ctx.textAlign = 'left';
}
