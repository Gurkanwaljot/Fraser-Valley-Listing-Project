import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, SAFE_INSET, brochureStyle, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';

const GAP = 8;
const COLS = 3;
const ATELIER_COVER_PHOTOS = 4;

export default function LetterAtelierInside({ listing, photos, realtor, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;

  const galleryPhotos = photos.slice(ATELIER_COVER_PHOTOS);
  const gallery = galleryPhotos.map((_, i) => resolveBrochureSrc(galleryPhotos, imageMap, i)).filter(Boolean);
  const fallbackHero = gallery.length === 0 ? resolveBrochureSrc(photos, imageMap, 0) : '';
  const count = gallery.length;

  const headerH = 80;
  const footerH = 100;
  const gridAreaH = h - headerH - footerH;

  const heroSpan = count >= 4 ? 1 : 0;
  const rows = heroSpan
    ? 2 + Math.max(0, Math.ceil((count - 3) / COLS))
    : Math.max(1, Math.ceil(count / COLS));
  const rowH = Math.floor((gridAreaH - (rows - 1) * GAP) / rows);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ height: headerH, padding: `${SAFE_INSET}px ${SAFE_INSET}px 0`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px' }}>
          <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 13, letterSpacing: '0.34em', textTransform: 'uppercase', color: style.gold }}>
            Feature Sheet
          </Box>
          <Box sx={{ fontFamily: LUXE_FONTS.prata, fontSize: 24, color: theme.ink, lineHeight: 1, textAlign: 'right' }}>
            {formatStreetAddress(listing)}
            {cityState && <Box component="span" sx={{ fontFamily: LUXE_FONTS.body, fontSize: 14, color: theme.sub, ml: '12px' }}>{cityState}</Box>}
          </Box>
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: theme.hairline, mt: '10px' }} />
      </Box>

      {/* Gallery mosaic - fills the page */}
      <Box sx={{ flex: 1, padding: `${GAP}px ${SAFE_INSET}px`, minHeight: 0 }}>
        {gallery.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridAutoRows: `${rowH}px`, gap: `${GAP}px`, width: '100%', height: '100%' }}>
            {gallery.map((src, i) => (
              <Box
                key={i}
                sx={{
                  ...(heroSpan && i === 0 ? { gridColumn: 'span 2', gridRow: 'span 2' } : {}),
                  overflow: 'hidden',
                }}
              >
                <PhotoFrame src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
              </Box>
            ))}
          </Box>
        ) : fallbackHero ? (
          <PhotoFrame src={fallbackHero} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
        ) : null}
      </Box>

      {/* Footer */}
      <Box sx={{ height: footerH, backgroundColor: theme.panel, padding: `0 ${SAFE_INSET}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.prata, fontSize: 22, color: style.fieldInk, lineHeight: 1.05 }}>
            {realtor.full_name}
          </Box>
          <Box sx={{ display: 'flex', gap: '16px', mt: '4px', flexWrap: 'wrap' }}>
            {realtor.phone && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 15, fontWeight: 500, color: style.fieldInk }}>{realtor.phone}</Box>}
            {realtor.email && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 13, color: style.fieldSub }}>{realtor.email}</Box>}
          </Box>
        </Box>
        <Box sx={{ flex: 'none' }}>
          {realtor.brokerage_logo_url ? (
            <Box component="img" src={realtor.brokerage_logo_url} alt="" sx={{ height: 44, width: 'auto', maxWidth: 180, objectFit: 'contain' }} />
          ) : realtor.brokerage ? (
            <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
