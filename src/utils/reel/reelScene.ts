import type { LuxeTheme } from '../../components/marketing/socialPosts/theme';

export type Tempo = 'cinematic' | 'balanced' | 'punchy';

export interface TempoPreset {
  dwell: number;
  transition: number;
  zoomRange: number;
  panFrac: number;
  outroDwell: number;
}

export const TEMPO_PRESETS: Record<Tempo, TempoPreset> = {
  cinematic: { dwell: 3.8, transition: 0.5, zoomRange: 0.22, panFrac: 0.09, outroDwell: 4.0 },
  balanced: { dwell: 2.8, transition: 0.35, zoomRange: 0.18, panFrac: 0.13, outroDwell: 4.0 },
  punchy: { dwell: 1.8, transition: 0.22, zoomRange: 0.14, panFrac: 0.15, outroDwell: 4.0 },
};

export interface PhotoSegment {
  kind: 'photo';
  imageKey: string;
  isHero: boolean;
  start: number;
  end: number;
  zoomLed: boolean;
  panDir: 1 | -1;
}

export interface OutroSegment {
  kind: 'outro';
  start: number;
  end: number;
}

export type Segment = PhotoSegment | OutroSegment;

export interface OutroData {
  name: string;
  phone?: string;
  email?: string;
  brokerageLogoKey?: string;
  headshotKey?: string;
  qrKey: string;
  price?: string;
  cta: string;
}

export interface ReelScene {
  width: 1080;
  height: 1920;
  fps: 30;
  tempo: TempoPreset;
  segments: Segment[];
  durationSec: number;
  statusHeadline: string | null;
  address: string;
  addressCity: string;
  specs: string;
  theme: LuxeTheme;
  agentName: string;
  agentBrokerage: string;
  outro: OutroData;
}

export function computeReelDuration(photoCount: number, tempo: TempoPreset): number {
  const photoDuration = photoCount * tempo.dwell + tempo.transition;
  return photoDuration + tempo.outroDwell;
}

export function maxPhotosForTempo(tempo: TempoPreset, maxSeconds = 90): number {
  let count = 20;
  while (count > 5 && computeReelDuration(count, tempo) > maxSeconds) {
    count--;
  }
  return count;
}

export interface BuildSceneInput {
  photoKeys: string[];
  tempo: Tempo;
  statusHeadline: string | null;
  address: string;
  addressCity: string;
  specs: string;
  theme: LuxeTheme;
  agentName: string;
  agentBrokerage: string;
  outro: OutroData;
}

export function buildScene(input: BuildSceneInput): ReelScene {
  const preset = TEMPO_PRESETS[input.tempo];
  const segments: Segment[] = [];

  let t = 0;
  for (let i = 0; i < input.photoKeys.length; i++) {
    const segDuration = preset.dwell + preset.transition;
    segments.push({
      kind: 'photo',
      imageKey: input.photoKeys[i],
      isHero: i === 0,
      start: t,
      end: t + segDuration,
      zoomLed: i % 2 === 0,
      panDir: i % 2 === 0 ? 1 : -1,
    });
    t += preset.dwell;
  }

  const outroStart = t;
  const outroEnd = outroStart + preset.outroDwell;
  segments.push({ kind: 'outro', start: outroStart, end: outroEnd });

  return {
    width: 1080,
    height: 1920,
    fps: 30,
    tempo: preset,
    segments,
    durationSec: outroEnd,
    statusHeadline: input.statusHeadline,
    address: input.address,
    addressCity: input.addressCity,
    specs: input.specs,
    theme: input.theme,
    agentName: input.agentName,
    agentBrokerage: input.agentBrokerage,
    outro: input.outro,
  };
}
