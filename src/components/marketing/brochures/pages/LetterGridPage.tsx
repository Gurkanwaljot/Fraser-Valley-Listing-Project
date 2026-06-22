import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, LETTER_SLOTS, SAFE_INSET, brochureStyle, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import Monogram from '../components/Monogram';

const FOOTER_H = 156;
const GAP = 8;
const COLS = 3;

export default function LetterGridPage({ listing, photos, realtor, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;

  const galleryPhotos = photos.slice(LETTER_SLOTS.cover, LETTER_SLOTS.cover + LETTER_SLOTS.gallery);
  const gallery = galleryPhotos.map((_, i) => resolveBrochureSrc(galleryPhotos, imageMap, i)).filter(Boolean);
  const fallbackHero = gallery.length === 0 ? resolveBrochureSrc(photos, imageMap, 0) : '';
  const count = gallery.length;
  const rows = Math.max(1, Math.ceil(count / COLS));

  const headerH = 132;
  const gridAreaH = h - headerH - FOOTER_H - SAFE_INSET;
  const rowH = Math.floor((gridAreaH - (rows - 1) * GAP) / rows);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, position: 'relative', overflow: 'hidden', fontFamily: LUXE_FONTS.body, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: headerH, padding: `${SAFE_INSET}px ${SAFE_INSET}px 0`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box sx={{ fontFamily: style.labelFont, fontSize: 16, fontWeight: 500, letterSpacing: '0.34em', textTransform: 'uppercase', color: style.gold }}>
          Feature Sheet
        </Box>
        <Box sx={{ mt: '10px', display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 34, color: theme.ink, lineHeight: 1 }}>
            {formatStreetAddress(listing)}
          </Box>
          {cityState && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 16, color: theme.sub }}>{cityState}</Box>
          )}
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: theme.hairline, mt: '16px' }} />
      </Box>

      <Box sx={{ flex: 1, padding: `${GAP + 8}px ${SAFE_INSET}px`, minHeight: 0 }}>
        {gallery.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${rows}, ${rowH}px)`, gap: `${GAP}px`, width: '100%' }}>
            {gallery.map((src, i) => (
              <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
            ))}
          </Box>
        ) : fallbackHero ? (
          <PhotoFrame src={fallbackHero} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
        ) : null}
      </Box>

      <Box sx={{ height: FOOTER_H, backgroundColor: theme.panel, padding: `0 ${SAFE_INSET}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '28px' }}>
        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 30, color: style.fieldInk, lineHeight: 1 }}>
            {realtor.full_name}
          </Box>
          {realtor.brokerage && (
            <Box sx={{ fontFamily: style.labelFont, fontSize: 14, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', mt: '2px', flexWrap: 'wrap' }}>
            {realtor.phone && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 18, fontWeight: 500, color: style.fieldInk }}>{realtor.phone}</Box>}
            {realtor.email && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 15, color: style.fieldSub }}>{realtor.email}</Box>}
          </Box>
        </Box>

        <Box sx={{ flex: 'none', width: '1px', alignSelf: 'stretch', my: '30px', backgroundColor: style.fieldSub, opacity: 0.4 }} />

        <Box sx={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
          {realtor.brokerage_logo_url ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Box component="img" src={realtor.brokerage_logo_url} alt="" sx={{ height: 52, width: 'auto', maxWidth: 220, objectFit: 'contain' }} />
              {realtor.brokerage && (
                <Box sx={{ fontFamily: style.labelFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold, textAlign: 'center' }}>
                  {realtor.brokerage}
                </Box>
              )}
            </Box>
          ) : (
            <>
              <Monogram name={realtor.full_name} size={64} theme={theme} onDark />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {realtor.brokerage && (
                  <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 22, color: style.fieldInk, lineHeight: 1 }}>
                    {realtor.brokerage}
                  </Box>
                )}
                <Box sx={{ width: 70, height: '2px', backgroundColor: style.gold }} />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
