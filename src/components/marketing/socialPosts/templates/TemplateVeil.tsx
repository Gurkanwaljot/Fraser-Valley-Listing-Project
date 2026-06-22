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
import AutoFitText from '../components/AutoFitText';
import { LUXE_FONTS } from '../theme';
import { dissolve, veil } from '../blend';

export default function TemplateVeil({ listing, photos, realtor, status, imageMap, theme }: PostTemplateProps) {
  const statusOpt = getStatusOption(status);
  const headline = toTitleCase(statusOpt?.headline || 'For Sale');
  const stats = getListingStats(listing);
  const price = formatPrice(listing.price, listing.currency);

  const heroSrc = resolveSrc(photos, imageMap, 0);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(' / ');

  return (
    <Box
      sx={{
        width: 1080,
        height: 1350,
        backgroundColor: theme.bg,
        color: theme.ink,
        fontFamily: LUXE_FONTS.body,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
      </Box>

      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300, background: veil(theme.scrim, { direction: 0, start: 30, strength: 0.6 }), pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 760, background: dissolve(theme.bg, { start: 8, mid: 0.5 }), pointerEvents: 'none' }} />

      <Box sx={{ position: 'absolute', top: 60, left: 72, right: 72, zIndex: 2 }}>
        <Eyebrow color={theme.accent}>{statusOpt?.label || 'For Sale'}</Eyebrow>
      </Box>

      <Box sx={{ position: 'absolute', left: 72, right: 72, bottom: 60, zIndex: 2, display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <AutoFitText
          maxFontSize={150}
          minFontSize={68}
          maxLines={2}
          fontFamily={LUXE_FONTS.didone}
          fontWeight={500}
          color={theme.ink}
          lineHeight={0.92}
          letterSpacing="-0.015em"
        >
          {headline}
        </AutoFitText>

        <Box sx={{ width: 96, height: '1px', backgroundColor: theme.accent }} />

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AutoFitText
              maxFontSize={42}
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
              valueSize={56}
              align="right"
              maxWidth="46%"
            />
          )}
        </Box>

        {stats.length > 0 && (
          <>
            <Box sx={{ height: '1px', backgroundColor: theme.hairline, width: '100%' }} />
            <SpecSheet stats={stats} theme={theme} valueSize={38} columns={4} max={4} />
          </>
        )}

        <Box sx={{ height: '1px', backgroundColor: theme.hairline, width: '100%' }} />
        <AgentSignature realtor={realtor} slug={listing.slug} theme={theme} showInstagram />
      </Box>
    </Box>
  );
}
