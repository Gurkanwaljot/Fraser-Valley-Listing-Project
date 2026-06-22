import { useMemo } from 'react';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import type { Listing, MediaAsset, Realtor } from '../../types/database';

interface ListingSEOProps {
  listing: Listing;
  media: MediaAsset[];
  realtors: Realtor[];
}

function formatPrice(price: number | null, currency: string): string {
  if (!price) return '';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

export default function ListingSEO({ listing, media, realtors }: ListingSEOProps) {
  const heroImage = media.find((m) => m.id === listing.hero_media_id);
  const heroUrl = heroImage?.public_url || heroImage?.thumbnail_url || media.find((m) => m.kind === 'photo')?.public_url || '';

  const streetLine = listing.address_line_2 ? `${listing.address_line_2} - ${listing.address_line_1}` : listing.address_line_1;
  const address = [streetLine, listing.city, listing.province_state].filter(Boolean).join(', ');
  const isSold = listing.status === 'sold';
  const title = isSold
    ? `SOLD — ${address} | Fraser Valley Real Estate Photography`
    : `${address} | Fraser Valley Real Estate Photography`;

  const stats: string[] = [];
  if (listing.bedrooms) stats.push(`${listing.bedrooms}bd`);
  if (listing.bathrooms) stats.push(`${listing.bathrooms}ba`);
  if (listing.square_footage) stats.push(`${listing.square_footage.toLocaleString()} sq. ft.`);
  const price = formatPrice(listing.price, listing.currency);
  if (price) stats.push(price);

  const description = isSold
    ? `SOLD — ${stats.join(' | ')} — ${address}`
    : stats.length > 0
      ? `${stats.join(' | ')} — Professional real estate media by Fraser Valley Real Estate Photography`
      : `Professional real estate listing — ${address}`;

  const canonicalUrl = `${window.location.origin}/listing/${listing.slug}`;

  const primaryRealtor = realtors[0];
  const photos = media.filter((m) => m.kind === 'photo').slice(0, 6);

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title || address,
    description: listing.description || description,
    url: canonicalUrl,
    ...(listing.price && { price: listing.price, priceCurrency: listing.currency }),
    ...(listing.bedrooms && { numberOfBedrooms: listing.bedrooms }),
    ...(listing.bathrooms && { numberOfBathroomsTotal: listing.bathrooms }),
    ...(listing.square_footage && { floorSize: { '@type': 'QuantitativeValue', value: listing.square_footage, unitCode: 'FTK' } }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: streetLine,
      addressLocality: listing.city,
      addressRegion: listing.province_state,
      postalCode: listing.postal_code,
      addressCountry: listing.country,
    },
    image: photos.map((p) => p.public_url).filter(Boolean),
    ...(listing.published_at && { datePosted: listing.published_at }),
    ...(primaryRealtor && {
      broker: {
        '@type': 'RealEstateAgent',
        name: primaryRealtor.full_name,
        ...(primaryRealtor.brokerage && { worksFor: { '@type': 'Organization', name: primaryRealtor.brokerage } }),
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [listing.id, listing.slug]);

  const meta = useMemo(() => [
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    ...(heroUrl ? [{ property: 'og:image', content: heroUrl }] : []),
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    ...(heroUrl ? [{ name: 'twitter:image', content: heroUrl }] : []),
  ], [title, description, canonicalUrl, heroUrl]);

  useDocumentHead({
    title,
    description,
    canonical: canonicalUrl,
    meta,
    jsonLd,
    preload: heroUrl ? [{ href: heroUrl, as: 'image', fetchpriority: 'high' }] : undefined,
  });

  return null;
}
