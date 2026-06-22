import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import AutoFitText from '../../socialPosts/components/AutoFitText';
import QrTile from '../../socialPosts/components/QrTile';
import Monogram from '../components/Monogram';

export default function SingleAperturePage({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;

  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const filmSrcs = [1, 2, 3, 4].map((i) => resolveBrochureSrc(photos, imageMap, i)).filter(Boolean);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');
  const specRows = buildSpecRows(listing, showPrice);
  const specLine = specRows.map((r) => `${r.label.toUpperCase()} ${r.value}`).join(' · ');

  const eyebrowH = 50;
  const heroH = Math.round(h * 0.44);
  const titleH = 110;
  const filmH = Math.round(h * 0.13);
  const specLineH = 56;
  const agentH = 90;
  const totalUsed = eyebrowH + heroH + titleH + filmH + specLineH + agentH;
  const gap = Math.max(0, Math.floor((h - SAFE_INSET * 2 - totalUsed) / 5));

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
      {/* Eyebrow */}
      <Box sx={{ height: eyebrowH, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ fontFamily: LUXE_FONTS.syne, fontSize: 12, fontWeight: 600, letterSpacing: '0.34em', textTransform: 'uppercase', color: style.gold }}>
          {listing.property_type ? listing.property_type.toUpperCase() : 'FOR SALE'}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Box sx={{ fontFamily: LUXE_FONTS.label, fontSize: 9, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.sub }}>
            Scan
          </Box>
          <QrTile slug={listing.slug} size={36} dark={theme.qrDark} light={theme.qrLight} rounded={4} />
        </Box>
      </Box>

      {/* Hero */}
      <Box sx={{ height: heroH, mt: `${gap}px`, border: `1px solid ${style.gold}`, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
      </Box>

      {/* Title block */}
      <Box sx={{ height: titleH, mt: `${gap}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AutoFitText maxFontSize={44} minFontSize={24} maxLines={2} fontFamily={LUXE_FONTS.syne} fontWeight={700} color={theme.ink} lineHeight={1.05}>
            {formatStreetAddress(listing)}
          </AutoFitText>
          {cityState && (
            <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.label, fontSize: 14, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: theme.sub }}>
              {cityState}
            </Box>
          )}
        </Box>
        {showPrice && listing.price && (
          <Box sx={{ flex: 'none', textAlign: 'right' }}>
            <AutoFitText maxFontSize={36} minFontSize={22} maxLines={1} fontFamily={LUXE_FONTS.syne} fontWeight={700} color={style.gold} lineHeight={1.1}>
              {buildSpecRows(listing, true).find((r) => r.label === 'Price')?.value || ''}
            </AutoFitText>
          </Box>
        )}
      </Box>

      {/* Filmstrip */}
      {filmSrcs.length > 0 && (
        <Box sx={{ height: filmH, mt: `${gap}px`, display: 'grid', gridTemplateColumns: `repeat(${filmSrcs.length}, 1fr)`, gap: '8px' }}>
          {filmSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      {/* Spec line */}
      <Box sx={{ height: specLineH, mt: `${gap}px`, display: 'flex', alignItems: 'center', borderTop: `1px solid ${theme.hairline}`, borderBottom: `1px solid ${theme.hairline}` }}>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <AutoFitText maxFontSize={13} minFontSize={9} maxLines={2} fontFamily={LUXE_FONTS.label} fontWeight={500} color={theme.ink} lineHeight={1.4} align="center" letterSpacing="0.16em">
            {specLine}
          </AutoFitText>
        </Box>
      </Box>

      {/* Agent footer */}
      <Box sx={{ height: agentH, mt: `${gap}px`, display: 'flex', alignItems: 'center', gap: '18px' }}>
        {realtor.headshot_url ? (
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', flex: 'none', border: `1px solid ${style.gold}` }}>
            <Box component="img" src={realtor.headshot_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ) : (
          <Monogram name={realtor.full_name} size={60} theme={theme} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.syne, fontSize: 22, fontWeight: 700, color: theme.ink, lineHeight: 1.1 }}>
            {realtor.full_name}
          </Box>
          <Box sx={{ display: 'flex', gap: '16px', mt: '4px', flexWrap: 'wrap' }}>
            {realtor.brokerage && (
              <Box sx={{ fontFamily: LUXE_FONTS.label, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
                {realtor.brokerage}
              </Box>
            )}
            {realtor.phone && (
              <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 14, fontWeight: 500, color: theme.ink }}>{realtor.phone}</Box>
            )}
            {realtor.email && (
              <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 13, color: theme.sub }}>{realtor.email}</Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
