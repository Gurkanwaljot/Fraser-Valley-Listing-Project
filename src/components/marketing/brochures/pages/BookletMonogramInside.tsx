import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, BOOKLET_SLOTS, SAFE_INSET, brochureStyle, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';

const FOOTER_H = 140;
const GAP = 10;
const COLS = 4;

export default function BookletMonogramInside({ listing, photos, realtor, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = BOOKLET_GEOMETRY.basePx;

  const galleryPhotos = photos.slice(BOOKLET_SLOTS.cover, BOOKLET_SLOTS.cover + BOOKLET_SLOTS.gallery);
  const srcs = galleryPhotos.map((_, i) => resolveBrochureSrc(galleryPhotos, imageMap, i)).filter(Boolean);
  const fallbackHero = srcs.length === 0 ? resolveBrochureSrc(photos, imageMap, 0) : '';
  const count = srcs.length;
  const rows = Math.max(1, Math.ceil(count / COLS));

  const headerH = 120;
  const gridAreaH = h - headerH - FOOTER_H - SAFE_INSET;
  const rowH = Math.floor((gridAreaH - (rows - 1) * GAP) / rows);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      {/* Header */}
      <Box sx={{ height: headerH, padding: `${SAFE_INSET}px ${SAFE_INSET}px 0`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px' }}>
          <Box sx={{ fontFamily: LUXE_FONTS.label, fontSize: 14, fontWeight: 500, letterSpacing: '0.34em', textTransform: 'uppercase', color: style.gold }}>
            Gallery
          </Box>
          <Box sx={{ fontFamily: LUXE_FONTS.didone, fontSize: 28, color: theme.ink, lineHeight: 1 }}>
            {formatStreetAddress(listing)}
            {cityState ? <Box component="span" sx={{ fontFamily: LUXE_FONTS.body, fontSize: 15, color: theme.sub, ml: '12px' }}>{cityState}</Box> : null}
          </Box>
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: theme.hairline, mt: '14px' }} />
      </Box>

      {/* Photo grid with accent hairline frames */}
      <Box sx={{ flex: 1, padding: `${GAP + 8}px ${SAFE_INSET}px`, minHeight: 0 }}>
        {srcs.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${rows}, ${rowH}px)`, gap: `${GAP}px`, width: '100%' }}>
            {srcs.map((src, i) => (
              <Box key={i} sx={{ border: `1px solid ${theme.accentSoft}`, overflow: 'hidden' }}>
                <PhotoFrame src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
              </Box>
            ))}
          </Box>
        ) : fallbackHero ? (
          <PhotoFrame src={fallbackHero} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
        ) : null}
      </Box>

      {/* Footer */}
      <Box sx={{ height: FOOTER_H, backgroundColor: theme.panel, padding: `0 ${SAFE_INSET}px`, display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.didone, fontSize: 26, color: style.fieldInk, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {realtor.full_name}
          </Box>
          {realtor.brokerage && (
            <Box sx={{ mt: '4px', fontFamily: style.labelFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 'none', display: 'flex', justifyContent: 'center' }}>
          {realtor.brokerage_logo_url ? (
            <Box component="img" src={realtor.brokerage_logo_url} alt="" sx={{ height: 50, width: 'auto', maxWidth: 240, objectFit: 'contain' }} />
          ) : null}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {realtor.phone && (
            <Box sx={{ fontFamily: LUXE_FONTS.didone, fontSize: 24, color: style.fieldInk, lineHeight: 1.05 }}>{realtor.phone}</Box>
          )}
          {realtor.email && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 14, color: style.fieldSub, mt: '3px' }}>{realtor.email}</Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
