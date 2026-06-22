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
import ScrimPanel from '../components/ScrimPanel';
import FitScale from '../components/FitScale';
import AutoFitText from '../components/AutoFitText';
import { LUXE_FONTS, photoZoneHeight, contentZoneHeight } from '../theme';

const FOOTER_H = 236;
const OVER_INK = '#F5EFE3';

export default function TemplateB({ listing, photos, realtor, status, imageMap, theme }: PostTemplateProps) {
  const statusOpt = getStatusOption(status);
  const headline = toTitleCase(statusOpt?.headline || 'For Sale');
  const stats = getListingStats(listing);
  const price = formatPrice(listing.price, listing.currency);
  const features = listing.features || [];

  const heroSrc = resolveSrc(photos, imageMap, 0);
  const stripSrcs = photos.slice(1, 5).map((_, i) => resolveSrc(photos, imageMap, i + 1));
  const hasStrip = stripSrcs.length >= 2;

  const photoH = photoZoneHeight(photos.length, 600, 820);
  const heroH = hasStrip ? Math.round(photoH * 0.74) : photoH;
  const stripH = hasStrip ? photoH - heroH - 6 : 0;
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
      <Box sx={{ position: 'relative', width: '100%', height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <ScrimPanel scrim={theme.scrim} from={30} strength={0.92} />
        <Box sx={{ position: 'absolute', left: 64, right: 64, bottom: 52, zIndex: 2 }}>
          <Eyebrow color={theme.accent}>For Private Viewing</Eyebrow>
          <Box sx={{ mt: '16px' }}>
            <AutoFitText
              maxFontSize={104}
              minFontSize={52}
              maxLines={2}
              fontFamily={LUXE_FONTS.display}
              fontWeight={500}
              color={OVER_INK}
              lineHeight={0.96}
              letterSpacing="-0.01em"
            >
              {headline}
            </AutoFitText>
          </Box>
        </Box>
      </Box>

      {hasStrip && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stripSrcs.length}, 1fr)`,
            gap: '6px',
            height: stripH,
            width: '100%',
            mt: '6px',
          }}
        >
          {stripSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      <FitScale height={contentH} align="center">
        <Box sx={{ padding: '0 64px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                valueSize={52}
                align="right"
                maxWidth="46%"
              />
            )}
          </Box>

          <Box sx={{ height: '1px', backgroundColor: theme.hairline, width: '100%' }} />

          {stats.length > 0 && <SpecSheet stats={stats} theme={theme} valueSize={40} max={4} />}
          {features.length > 0 && <FeatureList features={features} theme={theme} max={4} />}
        </Box>
      </FitScale>

      <Box
        sx={{
          height: FOOTER_H,
          backgroundColor: theme.bg,
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
