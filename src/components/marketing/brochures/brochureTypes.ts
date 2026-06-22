import type { ComponentType } from 'react';
import type { Listing, MediaAsset, Realtor } from '../../../types/database';
import { LUXE_FONTS, type LuxeTheme } from '../socialPosts/theme';
import { formatPrice, formatCurrencyCents } from '../../../services/marketingService';
import { toTitleCase } from '../socialPosts/templateTypes';

export type BrochureFormat = 'letter' | 'booklet';
export type BrochureFamily = 'single' | 'letter' | 'booklet';

export interface BrochureFormatDef {
  id: BrochureFormat;
  name: string;
  blurb: string;
  pageLabel: string;
  pageCount: number;
}

export const BROCHURE_FORMATS: BrochureFormatDef[] = [
  {
    id: 'letter',
    name: 'Letter Feature Sheet',
    blurb: 'Two-page portrait sheet: a cover with the spec table and a full photo grid.',
    pageLabel: '8.5 × 11 in · 2 pages',
    pageCount: 2,
  },
  {
    id: 'booklet',
    name: 'Folded Booklet',
    blurb: 'Two landscape spreads that fold in half — front/back cover plus an interior gallery.',
    pageLabel: '17 × 11 in folded · 2 spreads',
    pageCount: 2,
  },
];

export function getBrochureFormat(id: BrochureFormat): BrochureFormatDef {
  return BROCHURE_FORMATS.find((f) => f.id === id) ?? BROCHURE_FORMATS[0];
}

// ---- Print geometry (design scale: 100px = 1 inch, bleed 0.125", safe 0.375") ----
export const RASTER_SCALE = 3;
export const BLEED_PX = 12.5;
export const SAFE_PX = 37.5;
export const SAFE_INSET = BLEED_PX + SAFE_PX; // 50px from the bleed edge
export const SLUG_PX = 12.5; // 0.125" crop-mark zone OUTSIDE the bleed

// basePx is the artwork incl. bleed; sheetPx adds the slug zone on all sides; pt is the PDF page (= sheet).
export const LETTER_GEOMETRY = {
  basePx: { w: 875, h: 1125 },
  sheetPx: { w: 900, h: 1150 },
  pt: { w: 648, h: 828 },
};

export const BOOKLET_GEOMETRY = {
  basePx: { w: 1725, h: 1125 },
  sheetPx: { w: 1750, h: 1150 },
  pt: { w: 1260, h: 828 },
  foldX: 862.5,
};

// ---- Photo slot capacities (single source of truth shared by the wizard and the page templates) ----
export const LETTER_SLOTS = { cover: 3, gallery: 9 } as const;
export const BOOKLET_SLOTS = { cover: 4, gallery: 12 } as const;

export const PHOTO_CAPACITY: Record<BrochureFormat, number> = {
  letter: LETTER_SLOTS.cover + LETTER_SLOTS.gallery, // 12
  booklet: BOOKLET_SLOTS.cover + BOOKLET_SLOTS.gallery, // 16
};

// ---- Template registry ----
export interface BrochureTemplate {
  id: string;
  name: string;
  blurb: string;
  family: BrochureFamily;
  slots: { cover: number; gallery: number };
  pages: ComponentType<BrochurePageProps>[];
}

export function photoCapacity(t: BrochureTemplate): number {
  return t.slots.cover + t.slots.gallery;
}

export const FAMILY_GEOMETRY: Record<BrochureFamily, { basePx: { w: number; h: number }; sheetPx: { w: number; h: number }; pt: { w: number; h: number }; foldX?: number }> = {
  single: { basePx: LETTER_GEOMETRY.basePx, sheetPx: LETTER_GEOMETRY.sheetPx, pt: LETTER_GEOMETRY.pt },
  letter: { basePx: LETTER_GEOMETRY.basePx, sheetPx: LETTER_GEOMETRY.sheetPx, pt: LETTER_GEOMETRY.pt },
  booklet: { basePx: BOOKLET_GEOMETRY.basePx, sheetPx: BOOKLET_GEOMETRY.sheetPx, pt: BOOKLET_GEOMETRY.pt, foldX: BOOKLET_GEOMETRY.foldX },
};

// Populated after page components are defined (see templateRegistry.ts)
export let BROCHURE_TEMPLATES: BrochureTemplate[] = [];

export function registerBrochureTemplates(templates: BrochureTemplate[]): void {
  BROCHURE_TEMPLATES = templates;
}

export function getTemplate(id: string): BrochureTemplate {
  return BROCHURE_TEMPLATES.find((t) => t.id === id) ?? BROCHURE_TEMPLATES[0];
}

export function resolveFloorPlanSrc(asset: MediaAsset | undefined, imageMap: Map<string, string>): string {
  if (!asset) return '';
  const preloaded = imageMap.get(asset.id);
  if (preloaded) return preloaded;
  return asset.public_url || asset.large_url || asset.original_url || asset.thumbnail_url || '';
}

export function resolveBrochureSrc(photos: MediaAsset[], imageMap: Map<string, string>, idx: number): string {
  const asset = photos[idx];
  if (!asset) return '';
  const preloaded = imageMap.get(asset.id);
  if (preloaded) return preloaded;
  return asset.large_url || asset.original_url || asset.public_url || '';
}

export interface BrochurePageProps {
  listing: Listing;
  photos: MediaAsset[];
  floorPlans: MediaAsset[];
  realtor: Realtor;
  imageMap: Map<string, string>;
  theme: LuxeTheme;
  showPrice: boolean;
}

// ---- Derived styling tokens ----
const HERITAGE_GOLD = '#E8A33D';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  if (m.length !== 6) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const [r, g, b] = rgb.map((v) => v / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.5;
}

export interface BrochureStyle {
  gold: string;
  titleFont: string;
  titleWeight: number;
  labelFont: string;
  valueFont: string;
  valueWeight: number;
  fieldInk: string;
  fieldSub: string;
  fieldIsDark: boolean;
}

export function brochureStyle(theme: LuxeTheme): BrochureStyle {
  const heritage = theme.id === 'heritage';
  const fieldIsDark = isDarkColor(theme.panel);
  return {
    gold: heritage ? HERITAGE_GOLD : theme.accent,
    titleFont: heritage ? '"Playfair Display", Georgia, serif' : LUXE_FONTS.display,
    titleWeight: heritage ? 700 : 500,
    labelFont: LUXE_FONTS.label,
    valueFont: heritage ? LUXE_FONTS.body : LUXE_FONTS.display,
    valueWeight: heritage ? 600 : 500,
    fieldInk: fieldIsDark ? '#F4EFE5' : theme.ink,
    fieldSub: fieldIsDark ? 'rgba(244,239,229,0.66)' : theme.sub,
    fieldIsDark,
  };
}

export interface SpecRow {
  label: string;
  value: string;
}

export function buildSpecRows(listing: Listing, showPrice: boolean): SpecRow[] {
  const rows: SpecRow[] = [];
  if (showPrice) rows.push({ label: 'Price', value: listing.price ? formatPrice(listing.price, listing.currency) : 'N/A' });
  rows.push({ label: 'Type', value: listing.property_type ? toTitleCase(listing.property_type) : 'N/A' });
  rows.push({ label: 'Bedrooms', value: listing.bedrooms ? String(listing.bedrooms) : 'N/A' });
  rows.push({ label: 'Bathrooms', value: listing.bathrooms ? String(listing.bathrooms) : 'N/A' });
  rows.push({ label: 'Year Built', value: listing.year_built ? String(listing.year_built) : 'N/A' });
  rows.push({ label: 'Living Area', value: listing.square_footage ? `${listing.square_footage.toLocaleString()} sq. ft.` : 'N/A' });
  rows.push({ label: 'Lot Size', value: listing.lot_size ? `${listing.lot_size} sq. ft.` : 'N/A' });
  rows.push({ label: 'Prop. Tax', value: listing.property_taxes != null ? formatCurrencyCents(listing.property_taxes, listing.currency) : 'N/A' });
  return rows;
}
