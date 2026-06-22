import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import AutoFitText from '../../socialPosts/components/AutoFitText';
import FitScale from '../../socialPosts/components/FitScale';
import QrTile from '../../socialPosts/components/QrTile';
import Monogram from '../components/Monogram';

export default function SingleEstatePage({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;
  const frameInset = SAFE_INSET + 12;
  const innerW = w - frameInset * 2;

  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const sideSrcs = [1, 2, 3].map((i) => resolveBrochureSrc(photos, imageMap, i)).filter(Boolean);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');
  const specRows = buildSpecRows(listing, showPrice);

  const headerH = 108;
  const heroH = Math.round((h - frameInset * 2) * 0.34);
  const footerH = 104;
  const bodyH = h - frameInset * 2 - headerH - heroH - footerH - 40;

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body, position: 'relative' }}>
      {/* Classic double-rule frame */}
      <Box sx={{ position: 'absolute', top: frameInset - 6, left: frameInset - 6, right: frameInset - 6, bottom: frameInset - 6, border: `1px solid ${style.gold}`, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', top: frameInset, left: frameInset, right: frameInset, bottom: frameInset, border: `1px solid ${style.gold}`, pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', padding: `${frameInset + 8}px`, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* Centered masthead */}
        <Box sx={{ height: headerH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: innerW - 40 }}>
            <AutoFitText maxFontSize={40} minFontSize={22} maxLines={2} fontFamily={LUXE_FONTS.dmSerif} fontWeight={400} color={theme.ink} lineHeight={1.1} align="center">
              {formatStreetAddress(listing)}
            </AutoFitText>
          </Box>
          {cityState && (
            <Box sx={{ mt: '8px', fontFamily: LUXE_FONTS.fashionSans, fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.sub, textAlign: 'center' }}>
              {cityState}
            </Box>
          )}
          <Box sx={{ width: 60, height: '1px', backgroundColor: style.gold, mt: '12px' }} />
        </Box>

        {/* Hero */}
        <Box sx={{ height: heroH, mt: '12px', border: `1px solid ${theme.hairline}`, overflow: 'hidden' }}>
          <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        </Box>

        {/* Two-column body: spec ledger left, photo stack right */}
        <Box sx={{ flex: 1, mt: '16px', display: 'flex', gap: '24px', minHeight: 0, height: bodyH }}>
          {/* Left: spec ledger */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FitScale height={bodyH} align="flex-start">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%' }}>
                {specRows.map((row, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', py: '10px', borderBottom: `1px solid ${theme.hairline}` }}>
                    <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.sub }}>
                      {row.label}
                    </Box>
                    <Box sx={{ fontFamily: LUXE_FONTS.spectral, fontSize: 18, fontWeight: 500, color: theme.ink }}>
                      {row.value}
                    </Box>
                  </Box>
                ))}
              </Box>
            </FitScale>
          </Box>

          {/* Right: photo stack */}
          {sideSrcs.length > 0 && (
            <Box sx={{ width: '38%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sideSrcs.map((src, i) => (
                <Box key={i} sx={{ flex: 1, border: `1px solid ${theme.hairline}`, overflow: 'hidden', minHeight: 0 }}>
                  <PhotoFrame src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Agent footer on panel */}
        <Box sx={{ height: footerH, mt: '12px', backgroundColor: theme.panel, borderRadius: '2px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
            {realtor.headshot_url ? (
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flex: 'none', border: `1px solid ${style.gold}` }}>
                <Box component="img" src={realtor.headshot_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ) : (
              <Monogram name={realtor.full_name} size={56} theme={theme} onDark />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontFamily: LUXE_FONTS.dmSerif, fontSize: 22, color: style.fieldInk, lineHeight: 1.1 }}>
                {realtor.full_name}
              </Box>
              <Box sx={{ display: 'flex', gap: '14px', mt: '4px', flexWrap: 'wrap' }}>
                {realtor.brokerage && (
                  <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
                    {realtor.brokerage}
                  </Box>
                )}
                {realtor.phone && (
                  <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 13, fontWeight: 500, color: style.fieldInk }}>{realtor.phone}</Box>
                )}
              </Box>
            </Box>
          </Box>
          <QrTile slug={listing.slug} size={58} dark={theme.qrDark} light={theme.qrLight} rounded={4} />
        </Box>
      </Box>
    </Box>
  );
}
