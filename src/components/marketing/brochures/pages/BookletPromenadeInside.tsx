import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, SAFE_INSET, brochureStyle, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';

const FOOTER_H = 100;
const GAP = 14;

export default function BookletPromenadeInside({ listing, photos, realtor, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = BOOKLET_GEOMETRY.basePx;

  // 16-photo gallery: first 4 are cover, gallery starts at index 4
  const galleryPhotos = photos.slice(4, 20);
  const srcs = galleryPhotos.map((_, i) => resolveBrochureSrc(galleryPhotos, imageMap, i)).filter(Boolean);
  const fallbackHero = srcs.length === 0 ? resolveBrochureSrc(photos, imageMap, 0) : '';

  const headerH = 90;
  const galleryH = h - headerH - FOOTER_H - SAFE_INSET;

  // 4-6-6 row distribution with larger gutters
  const row1H = Math.round((galleryH - GAP * 2) * 0.40);
  const rowH = Math.round((galleryH - GAP * 2 - row1H) / 2);

  const r1 = srcs.slice(0, 4);
  const r2 = srcs.slice(4, 10);
  const r3 = srcs.slice(10, 16);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      {/* Header */}
      <Box sx={{ height: headerH, padding: `${SAFE_INSET}px ${SAFE_INSET}px 0`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px' }}>
          <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold }}>
            Gallery
          </Box>
          <Box sx={{ fontFamily: LUXE_FONTS.grand, fontSize: 24, color: theme.ink, lineHeight: 1 }}>
            {formatStreetAddress(listing)}
            {cityState ? <Box component="span" sx={{ fontFamily: LUXE_FONTS.body, fontSize: 14, color: theme.sub, ml: '12px' }}>{cityState}</Box> : null}
          </Box>
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: theme.hairline, mt: '12px' }} />
      </Box>

      {/* 4·6·6 grid with accent frames and larger gutters */}
      <Box sx={{ flex: 1, padding: `${GAP}px ${SAFE_INSET}px`, minHeight: 0 }}>
        {srcs.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px`, height: galleryH }}>
            {/* Row 1: 4 larger photos */}
            {r1.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${r1.length}, 1fr)`, gap: `${GAP}px`, height: row1H }}>
                {r1.map((s, i) => (
                  <Box key={i} sx={{ border: `1px solid ${theme.accentSoft}`, overflow: 'hidden' }}>
                    <PhotoFrame src={s} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
                  </Box>
                ))}
              </Box>
            )}
            {/* Row 2: up to 6 photos */}
            {r2.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${r2.length}, 1fr)`, gap: `${GAP}px`, height: rowH }}>
                {r2.map((s, i) => (
                  <Box key={i} sx={{ border: `1px solid ${theme.accentSoft}`, overflow: 'hidden' }}>
                    <PhotoFrame src={s} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
                  </Box>
                ))}
              </Box>
            )}
            {/* Row 3: up to 6 photos */}
            {r3.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${r3.length}, 1fr)`, gap: `${GAP}px`, height: rowH }}>
                {r3.map((s, i) => (
                  <Box key={i} sx={{ border: `1px solid ${theme.accentSoft}`, overflow: 'hidden' }}>
                    <PhotoFrame src={s} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : fallbackHero ? (
          <PhotoFrame src={fallbackHero} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
        ) : null}
      </Box>

      {/* Minimal footer */}
      <Box sx={{ height: FOOTER_H, backgroundColor: theme.panel, padding: `0 ${SAFE_INSET}px`, display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.grand, fontSize: 22, color: style.fieldInk, lineHeight: 1.05 }}>
            {realtor.full_name}
          </Box>
        </Box>
        <Box sx={{ flex: 'none' }}>
          {realtor.brokerage_logo_url ? (
            <Box component="img" src={realtor.brokerage_logo_url} alt="" sx={{ height: 44, width: 'auto', maxWidth: 200, objectFit: 'contain' }} />
          ) : realtor.brokerage ? (
            <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          ) : null}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {realtor.phone && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 16, fontWeight: 500, color: style.fieldInk }}>{realtor.phone}</Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
