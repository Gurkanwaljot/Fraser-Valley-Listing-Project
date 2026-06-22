import Box from '@mui/material/Box';
import type { PostTemplateProps } from '../templateTypes';
import { getStatusOption, toTitleCase } from '../templateTypes';
import { formatPrice, formatStreetAddress, getListingStats } from '../../../../services/marketingService';
import { resolveSrc } from '../resolveSrc';
import AgentSignature from '../components/AgentSignature';
import PhotoFrame from '../components/PhotoFrame';
import SpecSheet from '../components/SpecSheet';
import PriceTag from '../components/PriceTag';
import Eyebrow from '../components/Eyebrow';
import FitScale from '../components/FitScale';
import AutoFitText from '../components/AutoFitText';
import { LUXE_FONTS, photoZoneHeight, contentZoneHeight } from '../theme';
import { dissolve, veil } from '../blend';

const FOOTER_H = 228;
const OVER_INK = '#F6F0E6';

export default function TemplatePanorama({ listing, photos, realtor, status, imageMap, theme }: PostTemplateProps) {
  const statusOpt = getStatusOption(status);
  const headline = toTitleCase(statusOpt?.headline || 'For Sale');
  const stats = getListingStats(listing);
  const price = formatPrice(listing.price, listing.currency);

  const heroSrc = resolveSrc(photos, imageMap, 0);
  const strip = photos.slice(1, 6).map((_, i) => resolveSrc(photos, imageMap, i + 1));
  const hasStrip = strip.length > 0;

  const photoH = photoZoneHeight(photos.length, 620, 840);
  const stripH = hasStrip ? Math.round(Math.min(220, photoH * 0.24)) : 0;
  const heroH = photoH - stripH;
  const contentH = contentZoneHeight(photoH, FOOTER_H);

  const cityState = [listing.city, listing.province_state].filter(Boolean).join(' / ');

  return (
    <Box
      sx={{
        width: 1080,
        height: 1350,
        backgroundColor: theme.bg,
        color: theme.ink,
        fontFamily: LUXE_FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: photoH, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', width: '100%', height: heroH, overflow: 'hidden' }}>
          <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
          <Box sx={{ position: 'absolute', inset: 0, background: veil(theme.scrim, { start: 30, strength: 0.86 }), pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', inset: 0, background: veil(theme.scrim, { direction: 0, start: 55, strength: 0.4 }), pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', left: 80, right: 80, bottom: hasStrip ? 28 : 52, zIndex: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <Eyebrow color={theme.accent} align="center">{statusOpt?.label || 'For Sale'}</Eyebrow>
            <AutoFitText
              maxFontSize={108}
              minFontSize={52}
              maxLines={1}
              fontFamily={LUXE_FONTS.grand}
              fontWeight={400}
              color={OVER_INK}
              lineHeight={1.0}
              letterSpacing="0.04em"
              align="center"
            >
              {headline}
            </AutoFitText>
          </Box>
        </Box>

        {hasStrip && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${strip.length}, 1fr)`,
              gap: '4px',
              height: stripH,
              width: '100%',
            }}
          >
            {strip.map((src, i) => (
              <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
            ))}
          </Box>
        )}

        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: dissolve(theme.bg, { start: 0, mid: 0.55 }), pointerEvents: 'none' }} />
      </Box>

      <FitScale height={contentH} align="center">
        <Box sx={{ padding: '0 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <Box sx={{ maxWidth: '100%', minWidth: 0 }}>
            <AutoFitText
              maxFontSize={42}
              minFontSize={24}
              maxLines={2}
              fontFamily={LUXE_FONTS.editorial}
              fontWeight={400}
              color={theme.ink}
              lineHeight={1.1}
              align="center"
            >
              {formatStreetAddress(listing)}
            </AutoFitText>
            {cityState && (
              <Box sx={{ mt: '10px' }}>
                <Eyebrow color={theme.sub} fontSize={13} align="center">{cityState}</Eyebrow>
              </Box>
            )}
          </Box>

          <Box sx={{ width: 80, height: '1px', backgroundColor: theme.accent }} />

          {price && (
            <PriceTag
              price={price}
              label="Offered At"
              valueColor={theme.accent}
              labelColor={theme.sub}
              valueSize={56}
              align="center"
            />
          )}

          {stats.length > 0 && <SpecSheet stats={stats} theme={theme} valueSize={36} columns={stats.length >= 4 ? 4 : stats.length} max={4} />}
        </Box>
      </FitScale>

      <Box
        sx={{
          height: FOOTER_H,
          backgroundColor: theme.bg,
          padding: '0 80px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AgentSignature realtor={realtor} slug={listing.slug} theme={theme} showInstagram />
      </Box>
    </Box>
  );
}
