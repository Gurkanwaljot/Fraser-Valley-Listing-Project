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
import { LUXE_FONTS, photoZoneHeight, contentZoneHeight } from '../theme';

const FOOTER_H = 232;

export default function TemplateA({ listing, photos, realtor, status, imageMap, theme }: PostTemplateProps) {
  const statusOpt = getStatusOption(status);
  const headline = toTitleCase(statusOpt?.headline || 'For Sale');
  const stats = getListingStats(listing);
  const price = formatPrice(listing.price, listing.currency);
  const features = listing.features || [];

  const hasSecondary = photos.length >= 3;
  const photoH = photoZoneHeight(photos.length, 560, 760);
  const heroH = hasSecondary ? Math.round(photoH * 0.66) : photoH;
  const secondaryH = hasSecondary ? photoH - heroH - 6 : 0;
  const contentH = contentZoneHeight(photoH, FOOTER_H);

  const heroSrc = resolveSrc(photos, imageMap, 0);
  const sec1Src = resolveSrc(photos, imageMap, 1);
  const sec2Src = resolveSrc(photos, imageMap, 2);

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
      <Box sx={{ display: 'flex', height: heroH, width: '100%' }}>
        <Box sx={{ width: 470, flex: 'none', position: 'relative', backgroundColor: theme.panel }}>
          <FitScale height={heroH} align="center">
            <Box sx={{ padding: '0 48px 0 64px', display: 'flex', flexDirection: 'column' }}>
              <Eyebrow color={theme.accent}>Private Offering</Eyebrow>
              <Box sx={{ mt: '20px' }}>
                <AutoFitText
                  maxFontSize={92}
                  minFontSize={46}
                  maxLines={2}
                  fontFamily={LUXE_FONTS.display}
                  fontWeight={500}
                  color={theme.ink}
                  lineHeight={0.98}
                  letterSpacing="-0.01em"
                >
                  {headline}
                </AutoFitText>
              </Box>

              <Box sx={{ width: 84, height: '1px', backgroundColor: theme.accent, mt: '26px' }} />

              <Box sx={{ mt: '24px' }}>
                <AutoFitText
                  maxFontSize={34}
                  minFontSize={22}
                  maxLines={2}
                  fontFamily={LUXE_FONTS.editorial}
                  fontWeight={400}
                  color={theme.ink}
                  lineHeight={1.12}
                >
                  {formatStreetAddress(listing)}
                </AutoFitText>
              </Box>
              {cityState && (
                <Box sx={{ mt: '10px' }}>
                  <Eyebrow color={theme.sub} fontSize={13}>{cityState}</Eyebrow>
                </Box>
              )}

              {price && (
                <Box sx={{ mt: '26px' }}>
                  <PriceTag
                    price={price}
                    label="Offered At"
                    valueColor={theme.accent}
                    labelColor={theme.sub}
                    valueSize={58}
                  />
                </Box>
              )}
            </Box>
          </FitScale>
        </Box>

        <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        </Box>
      </Box>

      {hasSecondary && (
        <Box sx={{ display: 'flex', height: secondaryH, width: '100%', gap: '6px', mt: '6px' }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <PhotoFrame src={sec1Src} objectFit="cover" backgroundColor={theme.panel} />
          </Box>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <PhotoFrame src={sec2Src} objectFit="cover" backgroundColor={theme.panel} />
          </Box>
        </Box>
      )}

      <FitScale height={contentH} align="center">
        <Box sx={{ padding: '0 64px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {stats.length > 0 && <SpecSheet stats={stats} theme={theme} valueSize={42} max={4} />}
          {stats.length > 0 && features.length > 0 && (
            <Box sx={{ height: '1px', backgroundColor: theme.hairline, width: '100%' }} />
          )}
          {features.length > 0 && <FeatureList features={features} theme={theme} max={4} />}
        </Box>
      </FitScale>

      <Box
        sx={{
          height: FOOTER_H,
          backgroundColor: theme.panel,
          borderTop: `1px solid ${theme.hairline}`,
          padding: '0 64px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AgentSignature realtor={realtor} slug={listing.slug} theme={theme} showInstagram />
      </Box>
    </Box>
  );
}
