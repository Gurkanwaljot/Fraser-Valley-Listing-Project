import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { LETTER_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import { rgba } from '../../socialPosts/blend';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import FitScale from '../../socialPosts/components/FitScale';
import QrTile from '../../socialPosts/components/QrTile';
import BrochureSpecTable from '../components/BrochureSpecTable';
import BrochureAgentBand from '../components/BrochureAgentBand';

const HERO_H = 472;

export default function LetterCoverPage({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const { w, h } = LETTER_GEOMETRY.basePx;
  const fieldH = h - HERO_H;
  const padTop = 46;
  const padBottom = 44;
  const bandH = 110;
  const columnsH = fieldH - padTop - padBottom - bandH - 26;

  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const sideA = resolveBrochureSrc(photos, imageMap, 1);
  const sideB = resolveBrochureSrc(photos, imageMap, 2);
  const sidePhotos = [sideA, sideB].filter(Boolean);

  const specRows = buildSpecRows(listing, showPrice);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  return (
    <Box sx={{ width: w, height: h, backgroundColor: theme.bg, position: 'relative', overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      <Box sx={{ position: 'relative', width: '100%', height: HERO_H, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(theme.scrim, 0.28)} 0%, ${rgba(theme.scrim, 0)} 40%)`, pointerEvents: 'none' }} />

        <Box
          sx={{
            position: 'absolute',
            top: SAFE_INSET,
            right: SAFE_INSET,
            maxWidth: 420,
            backgroundColor: theme.bg,
            borderTop: `3px solid ${style.gold}`,
            padding: '22px 28px 24px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
          }}
        >
          <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 36, lineHeight: 1.04, color: theme.ink }}>
            {formatStreetAddress(listing)}
          </Box>
          {cityState && (
            <Box sx={{ mt: '8px', fontFamily: style.labelFont, fontSize: 14, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.sub }}>
              {cityState}
            </Box>
          )}
          {listing.mls_number && (
            <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.body, fontSize: 13, color: theme.sub }}>MLS® {listing.mls_number}</Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: HERO_H,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.panel,
          backgroundImage: `linear-gradient(135deg, ${rgba('#FFFFFF', style.fieldIsDark ? 0.05 : 0.0)} 0%, ${rgba(theme.scrim, 0.18)} 100%)`,
          padding: `${padTop}px ${SAFE_INSET}px ${padBottom}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', gap: '36px', height: columnsH }}>
          {sidePhotos.length > 0 && (
            <Box sx={{ width: '42%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sidePhotos.map((src, i) => (
                <Box key={i} sx={{ flex: 1, backgroundColor: style.fieldIsDark ? 'rgba(255,255,255,0.92)' : theme.bg, padding: '6px', minHeight: 0 }}>
                  <PhotoFrame src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 40, lineHeight: 1.02, color: style.fieldInk }}>
              Property Features
            </Box>
            <Box sx={{ width: 84, height: '3px', backgroundColor: style.gold, mt: '14px', mb: '20px' }} />
            <FitScale height={columnsH - 76} align="flex-start">
              <BrochureSpecTable rows={specRows} theme={theme} onDark valueSize={28} />
            </FitScale>
          </Box>
        </Box>

        <Box sx={{ height: '1px', backgroundColor: style.fieldIsDark ? 'rgba(244,239,229,0.2)' : theme.hairline, my: '22px' }} />

        <Box sx={{ height: bandH, display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <BrochureAgentBand realtor={realtor} theme={theme} onDark />
          </Box>
          <Box sx={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <QrTile slug={listing.slug} size={70} dark={theme.qrDark} light={theme.qrLight} rounded={6} />
            <Box sx={{ fontFamily: style.labelFont, fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.fieldSub }}>
              Scan for details
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
