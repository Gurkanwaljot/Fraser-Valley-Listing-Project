import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { drawReelFrame, loadReelFonts } from './reelDraw';
import type { ReelScene } from './reelScene';

export class NoWebCodecsError extends Error {
  constructor() {
    super('WebCodecs VideoEncoder is not available in this browser. Use Chrome, Edge, or Safari 16.4+.');
    this.name = 'NoWebCodecsError';
  }
}

export type EncodeProgressCallback = (progress: number) => void;

export async function encodeReel(
  scene: ReelScene,
  imgs: Map<string, HTMLImageElement | ImageBitmap>,
  extras: {
    headshot: HTMLImageElement | null;
    logo: HTMLImageElement | null;
    qr: HTMLImageElement | null;
  },
  onProgress?: EncodeProgressCallback,
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') {
    throw new NoWebCodecsError();
  }

  await loadReelFonts();

  const { width, height, fps } = scene;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; },
  });

  encoder.configure({
    codec: 'avc1.640028',
    width,
    height,
    bitrate: 12_000_000,
    framerate: fps,
  });

  const totalFrames = Math.round(scene.durationSec * fps);

  for (let f = 0; f < totalFrames; f++) {
    if (encoderError) throw encoderError;

    const t = f / fps;
    drawReelFrame(
      ctx as unknown as CanvasRenderingContext2D,
      scene,
      t,
      imgs,
      extras.headshot,
      extras.logo,
      extras.qr,
    );

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((f * 1_000_000) / fps),
      duration: Math.round(1_000_000 / fps),
    });

    const keyFrame = f % (fps * 2) === 0;
    encoder.encode(frame, { keyFrame });
    frame.close();

    // Backpressure: wait if queue builds up
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (encoder.encodeQueueSize <= 4) resolve();
          else setTimeout(check, 4);
        };
        check();
      });
    }

    if (f % 5 === 0) onProgress?.(f / totalFrames);
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  onProgress?.(1);

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  return new Blob([buffer], { type: 'video/mp4' });
}
