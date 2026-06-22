import Box from '@mui/material/Box';
import type { PostTemplateProps } from '../templateTypes';
import { getStatusOption, toTitleCase } from '../templateTypes';
import { formatPrice, formatStreetAddress, getListingStats } from '../../../../services/marketingService';
import { resolveSrc } from '../resolveSrc';
import AgentSignature from '../components/AgentSignature';
import PhotoFrame from '../components/PhotoFrame';
import SpecSheet from '../components/SpecSheet';
import FeatureList from '../components/FeatureList';
import PriceTag from '../components/PriceTag';
import Eyebrow from '../components/Eyebrow';
import FitScale from '../components/FitScale';
import AutoFitText from '../components/AutoFitText';
import { LUXE_FONTS, photoZoneHeight, contentZoneHeight, gridColumns } from '../theme';
import { dissolve, veil } from '../blend';

const FOOTER_H = 232;
const OVER_INK = '#F5EFE3';

export default function TemplateCascade({ listing, photos, realtor, status, imageMap, theme }: PostTemplateProps) {
  const statusOpt = getStatusOption(status);
  const headline = toTitleCase(statusOpt?.headline || 'For Sale');
  const stats = getListingStats(listing);
  const price = formatPrice(listing.price, listing.currency);
  const features = listing.features || [];

  const heroSrc = resolveSrc(photos, imageMap, 0);
  const extras = photos.slice(1, 7).map((_, i) => resolveSrc(photos, imageMap, i + 1));
  const gridCount = extras.length;

  const photoH = photoZoneHeight(photos.length, 600, 860);
  const contentH = contentZoneHeight(photoH, FOOTER_H);

  const gridCols = gridColumns(gridCount);
  const gridRows = gridCount === 0 ? 0 : Math.ceil(gridCount / gridCols);
  const heroH = gridCount === 0 ? photoH : Math.round(photoH * 0.62);
  const gridH = gridCount === 0 ? 0 : photoH - heroH;
  const rowH = gridRows === 0 ? 0 : Math.floor((gridH - (gridRows - 1) * 4) / gridRows);

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
          <Box sx={{ position: 'absolute', inset: 0, background: veil(theme.scrim, { start: 34, strength: 0.9 }), pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', left: 60, right: 60, bottom: gridCount === 0 ? 56 : 36, zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: '26px' }}>
            <Box sx={{ width: 4, alignSelf: 'stretch', backgroundColor: theme.accent, flex: 'none', minHeight: 84 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Eyebrow color={theme.accent}>{statusOpt?.label || 'For Sale'}</Eyebrow>
              <Box sx={{ mt: '16px' }}>
                <AutoFitText
                  maxFontSize={88}
                  minFontSize={44}
                  maxLines={2}
                  fontFamily={LUXE_FONTS.inscribed}
                  fontWeight={400}
                  color={OVER_INK}
                  lineHeight={1.0}
                  letterSpacing="0.02em"
                  textTransform="uppercase"
                >
                  {headline}
                </AutoFitText>
              </Box>
            </Box>
          </Box>
        </Box>

        {gridCount > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, ${rowH}px)`,
              gap: '4px',
              height: gridH,
              width: '100%',
            }}
          >
            {extras.map((src, i) => (
              <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
            ))}
          </Box>
        )}

        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, background: dissolve(theme.bg, { start: 0, mid: 0.55 }), pointerEvents: 'none' }} />
      </Box>

      <FitScale height={contentH} align="center">
        <Box sx={{ padding: '0 60px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AutoFitText
                maxFontSize={40}
                minFontSize={24}
                maxLines={2}
                fontFamily={LUXE_FONTS.editorial}
                fontWeight={400}
                color={theme.ink}
                lineHeight={1.1}
              >
                {formatStreetAddress(listing)}
              </AutoFitText>
              {cityState && (
                <Box sx={{ mt: '10px' }}>
                  <Eyebrow color={theme.sub} fontSize={13}>{cityState}</Eyebrow>
                </Box>
              )}
            </Box>
            {price && (
              <PriceTag
                price={price}
                label="Offered At"
                valueColor={theme.accent}
                labelColor={theme.sub}
                valueSize={50}
                align="right"
                maxWidth="46%"
              />
            )}
          </Box>

          <Box sx={{ height: '1px', backgroundColor: theme.hairline, width: '100%' }} />

          {stats.length > 0 && <SpecSheet stats={stats} theme={theme} valueSize={38} max={4} />}
          {features.length > 0 && <FeatureList features={features} theme={theme} max={4} />}
        </Box>
      </FitScale>

      <Box
        sx={{
          height: FOOTER_H,
          backgroundColor: theme.bg,
          padding: '0 60px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AgentSignature realtor={realtor} slug={listing.slug} theme={theme} showInstagram />
      </Box>
    </Box>
  );
}
