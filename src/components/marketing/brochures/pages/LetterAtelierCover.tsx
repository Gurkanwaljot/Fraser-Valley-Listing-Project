import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import { rgba } from '../../socialPosts/blend';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import AutoFitText from '../../socialPosts/components/AutoFitText';
import FitScale from '../../socialPosts/components/FitScale';
import QrTile from '../../socialPosts/components/QrTile';

export default function LetterAtelierCover({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;
  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const bandSrcs = [1, 2, 3].map((i) => resolveBrochureSrc(photos, imageMap, i)).filter(Boolean);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');
  const specRows = buildSpecRows(listing, showPrice);

  const agentBandH = 72;
  const bandPhotoH = 120;
  const heroH = h - agentBandH - (bandSrcs.length > 0 ? bandPhotoH : 0);

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Full-bleed hero with scrim */}
      <Box sx={{ position: 'relative', width: '100%', height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(theme.scrim, 0.22)} 0%, ${rgba(theme.scrim, 0)} 35%, ${rgba(theme.scrim, 0)} 50%, ${rgba(theme.scrim, 0.6)} 100%)`, pointerEvents: 'none' }} />

        {/* QR top-right */}
        <Box sx={{ position: 'absolute', top: SAFE_INSET, right: SAFE_INSET, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrTile slug={listing.slug} size={46} dark={theme.qrDark} light={theme.qrLight} rounded={4} />
        </Box>

        {/* Eyebrow kicker */}
        <Box sx={{ position: 'absolute', top: SAFE_INSET + 6, left: SAFE_INSET, fontFamily: LUXE_FONTS.fashionSans, fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
          {listing.property_type ? listing.property_type.toUpperCase() : 'FOR SALE'}
        </Box>

        {/* Masthead overlay on scrim */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `0 ${SAFE_INSET}px ${SAFE_INSET + 8}px` }}>
          <Box sx={{ maxWidth: '75%' }}>
            <AutoFitText maxFontSize={48} minFontSize={28} maxLines={2} fontFamily={LUXE_FONTS.prata} fontWeight={400} color="#FFFFFF" lineHeight={1.08}>
              {formatStreetAddress(listing)}
            </AutoFitText>
          </Box>
          {cityState && (
            <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.fashionSans, fontSize: 14, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              {cityState}
            </Box>
          )}
        </Box>

        {/* Spec sidebar on scrim */}
        <Box sx={{ position: 'absolute', bottom: SAFE_INSET + 8, right: SAFE_INSET, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: '4px', padding: '12px 16px' }}>
          <FitScale height={240} align="flex-end">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              {specRows.map((row, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                    {row.label}
                  </Box>
                  <Box sx={{ fontFamily: LUXE_FONTS.spectral, fontSize: 16, fontWeight: 500, color: '#FFFFFF' }}>
                    {row.value}
                  </Box>
                </Box>
              ))}
            </Box>
          </FitScale>
        </Box>
      </Box>

      {/* Band photos */}
      {bandSrcs.length > 0 && (
        <Box sx={{ height: bandPhotoH, display: 'grid', gridTemplateColumns: `repeat(${bandSrcs.length}, 1fr)`, gap: '0px' }}>
          {bandSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      {/* Agent band */}
      <Box sx={{ height: agentBandH, backgroundColor: theme.panel, padding: `0 ${SAFE_INSET}px`, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Box sx={{ fontFamily: LUXE_FONTS.prata, fontSize: 20, color: style.fieldInk, lineHeight: 1 }}>
          {realtor.full_name}
        </Box>
        {realtor.brokerage && (
          <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
            {realtor.brokerage}
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {realtor.phone && (
          <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 14, fontWeight: 500, color: style.fieldInk }}>{realtor.phone}</Box>
        )}
      </Box>
    </Box>
  );
}
