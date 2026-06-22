export const COLORS = {
  navy: '#0F2238',
  navyDeep: '#091625',
  red: '#C8102E',
  redDark: '#9B0B22',
  gold: '#C2A24E',
  goldLight: '#D9BE73',
  cream: '#F7F3EA',
  paper: '#FFFFFF',
  ink: '#16202E',
  muted: '#5A6675',
  hairline: 'rgba(15, 34, 56, 0.18)',
} as const;

export const FONTS = {
  serif: '"Playfair Display", "Times New Roman", Georgia, serif',
  sans: '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif',
} as const;

export const LUXE_FONTS = {
  display: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
  editorial: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  label: '"Jost", "Hanken Grotesk", sans-serif',
  body: '"Hanken Grotesk", sans-serif',
  didone: '"Bodoni Moda", "Playfair Display", Georgia, serif',
  inscribed: '"Marcellus", "Cormorant Garamond", Georgia, serif',
  grand: '"Italiana", "Cormorant Garamond", Georgia, serif',
  fashionSans: '"Tenor Sans", "Jost", sans-serif',
  syne: '"Syne", "Jost", sans-serif',
  prata: '"Prata", "Bodoni Moda", Georgia, serif',
  dmSerif: '"DM Serif Display", "Playfair Display", Georgia, serif',
  spectral: '"Spectral", "Cormorant Garamond", Georgia, serif',
  bigShoulders: '"Big Shoulders Display", "Archivo", sans-serif',
} as const;

export type ThemeMode = 'light' | 'dark';

export interface LuxeTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  bg: string;
  panel: string;
  ink: string;
  sub: string;
  accent: string;
  accentSoft: string;
  hairline: string;
  scrim: string;
  qrDark: string;
  qrLight: string;
}

export const LUXE_THEMES: LuxeTheme[] = [
  {
    id: 'ivory',
    name: 'Ivory & Brass',
    mode: 'light',
    bg: '#F4EFE6',
    panel: '#ECE5D8',
    ink: '#1B1A17',
    sub: '#6E665B',
    accent: '#A8854C',
    accentSoft: 'rgba(168,133,76,0.45)',
    hairline: 'rgba(27,26,23,0.18)',
    scrim: '#0C0904',
    qrDark: '#1B1A17',
    qrLight: '#F4EFE6',
  },
  {
    id: 'onyx',
    name: 'Onyx & Champagne',
    mode: 'dark',
    bg: '#0E0E10',
    panel: '#17171B',
    ink: '#F2ECE0',
    sub: 'rgba(242,236,224,0.60)',
    accent: '#C9A86A',
    accentSoft: 'rgba(201,168,106,0.50)',
    hairline: 'rgba(201,168,106,0.28)',
    scrim: '#000000',
    qrDark: '#0E0E10',
    qrLight: '#C9A86A',
  },
  {
    id: 'estate',
    name: 'Estate Green',
    mode: 'dark',
    bg: '#12332A',
    panel: '#0E2A22',
    ink: '#F1EADB',
    sub: 'rgba(241,234,219,0.62)',
    accent: '#BFA06A',
    accentSoft: 'rgba(191,160,106,0.45)',
    hairline: 'rgba(191,160,106,0.30)',
    scrim: '#04100C',
    qrDark: '#0E2A22',
    qrLight: '#BFA06A',
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    mode: 'dark',
    bg: '#0B1A2B',
    panel: '#0A1626',
    ink: '#EEF1F5',
    sub: 'rgba(238,241,245,0.62)',
    accent: '#C7A867',
    accentSoft: 'rgba(199,168,103,0.45)',
    hairline: 'rgba(199,168,103,0.28)',
    scrim: '#020810',
    qrDark: '#0A1626',
    qrLight: '#C7A867',
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux & Gilt',
    mode: 'dark',
    bg: '#2A0E16',
    panel: '#220A12',
    ink: '#F2E4D8',
    sub: 'rgba(242,228,216,0.62)',
    accent: '#C9A24B',
    accentSoft: 'rgba(201,162,75,0.45)',
    hairline: 'rgba(201,162,75,0.28)',
    scrim: '#160509',
    qrDark: '#220A12',
    qrLight: '#C9A24B',
  },
  {
    id: 'porcelain',
    name: 'Porcelain & Pewter',
    mode: 'light',
    bg: '#F3F2EF',
    panel: '#E8E7E2',
    ink: '#1F2024',
    sub: '#6C6E72',
    accent: '#8A8C92',
    accentSoft: 'rgba(138,140,146,0.42)',
    hairline: 'rgba(31,32,36,0.16)',
    scrim: '#0A0B0D',
    qrDark: '#1F2024',
    qrLight: '#F3F2EF',
  },
  {
    id: 'clay',
    name: 'Clay & Bronze',
    mode: 'light',
    bg: '#EDE3D8',
    panel: '#E2D5C6',
    ink: '#2C1E14',
    sub: '#7A6655',
    accent: '#A56A3C',
    accentSoft: 'rgba(165,106,60,0.42)',
    hairline: 'rgba(44,30,20,0.18)',
    scrim: '#190F08',
    qrDark: '#2C1E14',
    qrLight: '#EDE3D8',
  },
  {
    id: 'plum',
    name: 'Plum & Champagne',
    mode: 'dark',
    bg: '#1E1424',
    panel: '#170F1C',
    ink: '#F0E8EC',
    sub: 'rgba(240,232,236,0.60)',
    accent: '#C8A36C',
    accentSoft: 'rgba(200,163,108,0.45)',
    hairline: 'rgba(200,163,108,0.26)',
    scrim: '#0C0710',
    qrDark: '#170F1C',
    qrLight: '#C8A36C',
  },
  {
    id: 'heritage',
    name: 'Heritage Navy',
    mode: 'light',
    bg: '#FFFFFF',
    panel: '#14315C',
    ink: '#14315C',
    sub: '#5A6675',
    accent: '#C8102E',
    accentSoft: 'rgba(200,16,46,0.4)',
    hairline: 'rgba(20,49,92,0.18)',
    scrim: '#0A1830',
    qrDark: '#14315C',
    qrLight: '#FFFFFF',
  },
  {
    id: 'blush',
    name: 'Blush & Champagne',
    mode: 'light',
    bg: '#F7EFEA',
    panel: '#6F3D49',
    ink: '#3B2D30',
    sub: '#8A7479',
    accent: '#C7A062',
    accentSoft: 'rgba(199,160,98,0.42)',
    hairline: 'rgba(59,45,48,0.16)',
    scrim: '#2A1A1E',
    qrDark: '#3B2D30',
    qrLight: '#F7EFEA',
  },
  {
    id: 'sage',
    name: 'Sage & Ivory',
    mode: 'light',
    bg: '#F1F1E7',
    panel: '#36473C',
    ink: '#2B342D',
    sub: '#6E7468',
    accent: '#A4894F',
    accentSoft: 'rgba(164,137,79,0.42)',
    hairline: 'rgba(43,52,45,0.16)',
    scrim: '#141C16',
    qrDark: '#2B342D',
    qrLight: '#F1F1E7',
  },
  {
    id: 'sky',
    name: 'Sky & Bronze',
    mode: 'light',
    bg: '#EDF1F4',
    panel: '#39495A',
    ink: '#232C34',
    sub: '#6B7682',
    accent: '#B0895C',
    accentSoft: 'rgba(176,137,92,0.42)',
    hairline: 'rgba(35,44,52,0.16)',
    scrim: '#121A22',
    qrDark: '#232C34',
    qrLight: '#EDF1F4',
  },
  {
    id: 'sand',
    name: 'Sand & Sea Glass',
    mode: 'light',
    bg: '#F4EDE0',
    panel: '#2F5751',
    ink: '#33302A',
    sub: '#7C7468',
    accent: '#BD8A55',
    accentSoft: 'rgba(189,138,85,0.42)',
    hairline: 'rgba(51,48,42,0.16)',
    scrim: '#0F211D',
    qrDark: '#33302A',
    qrLight: '#F4EDE0',
  },
];

export function getThemeById(id: string | null): LuxeTheme {
  return LUXE_THEMES.find((t) => t.id === id) ?? LUXE_THEMES[0];
}

export const FRAME_H = 1350;

export function photoZoneHeight(count: number, base: number, max: number): number {
  const t = Math.min(1, Math.max(0, (count - 1) / 6));
  return Math.round(base + (max - base) * t);
}

export function contentZoneHeight(photoH: number, footerH: number): number {
  return Math.max(120, FRAME_H - photoH - footerH);
}

export function gridColumns(count: number): number {
  if (count <= 3) return count;
  if (count === 4) return 2;
  return 3;
}
