import type { ComponentType } from 'react';
import type { Listing, MediaAsset, Realtor } from '../../../types/database';
import type { LuxeTheme } from './theme';

export type PostStatus =
  | 'for-sale'
  | 'new-listing'
  | 'price-dropped'
  | 'sold'
  | 'sold-asking'
  | 'sold-above'
  | 'just-listed'
  | 'offer-made'
  | 'offer-accepted'
  | 'for-lease'
  | 'leased'
  | 'open-house';

export interface StatusOption {
  value: PostStatus;
  label: string;
  headline: string;
  tone: 'gold' | 'red';
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'for-sale', label: 'For Sale', headline: 'FOR SALE', tone: 'gold' },
  { value: 'just-listed', label: 'Just Listed', headline: 'JUST LISTED', tone: 'gold' },
  { value: 'new-listing', label: 'New Listing', headline: 'NEW LISTING', tone: 'gold' },
  { value: 'price-dropped', label: 'Price Reduced', headline: 'PRICE REDUCED', tone: 'red' },
  { value: 'sold', label: 'Sold', headline: 'SOLD', tone: 'red' },
  { value: 'sold-asking', label: 'Sold for Asking', headline: 'SOLD FOR ASKING', tone: 'gold' },
  { value: 'sold-above', label: 'Sold Above Asking', headline: 'SOLD ABOVE ASKING', tone: 'gold' },
  { value: 'offer-made', label: 'Offer Made', headline: 'OFFER MADE', tone: 'gold' },
  { value: 'offer-accepted', label: 'Offer Accepted', headline: 'OFFER ACCEPTED', tone: 'gold' },
  { value: 'for-lease', label: 'For Lease', headline: 'FOR LEASE', tone: 'gold' },
  { value: 'leased', label: 'Leased', headline: 'LEASED', tone: 'red' },
  { value: 'open-house', label: 'Open House', headline: 'OPEN HOUSE', tone: 'gold' },
];

export function getStatusOption(value: PostStatus | null): StatusOption | null {
  if (!value) return null;
  return STATUS_OPTIONS.find((s) => s.value === value) ?? null;
}

export type BrandSystem = 'classic' | 'editorial' | 'magazine' | 'luxury' | 'blended';

export interface PostTemplateProps {
  listing: Listing;
  photos: MediaAsset[];
  realtor: Realtor;
  status: PostStatus;
  imageMap: Map<string, string>;
  theme: LuxeTheme;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  blurb: string;
  brandSystem: BrandSystem;
  minPhotos: number;
  maxPhotos: number;
  defaultPalette: string;
  Component: ComponentType<PostTemplateProps>;
}

export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
