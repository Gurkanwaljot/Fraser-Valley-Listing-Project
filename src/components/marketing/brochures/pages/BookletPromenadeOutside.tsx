import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveFloorPlanSrc, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import { rgba } from '../../socialPosts/blend';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import AutoFitText from '../../socialPosts/components/AutoFitText';
import FitScale from '../../socialPosts/components/FitScale';
import FloorPlanFrame from '../components/FloorPlanFrame';
import QrTile from '../../socialPosts/components/QrTile';
import Monogram from '../components/Monogram';

const HALF = BOOKLET_GEOMETRY.foldX;
const H = BOOKLET_GEOMETRY.basePx.h;

function BackCover({ listing, floorPlans, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const innerW = HALF - SAFE_INSET * 2;

  if (floorPlans.length > 0) {
    const plans = floorPlans.slice(0, 3);
    const planSrcs = plans.map((p) => resolveFloorPlanSrc(p, imageMap));
    const stackH = H - SAFE_INSET * 2 - 80;
    const planH = Math.floor((stackH - (plans.length - 1) * 16) / plans.length);
    return (
      <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 13, letterSpacing: '0.28em', textTransform: 'uppercase', color: style.gold, textAlign: 'center' }}>
          Floor Plans
        </Box>
        <Box sx={{ width: 40, height: '1px', backgroundColor: style.gold, mx: 'auto', mt: '10px', mb: '18px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {plans.map((plan, i) => {
            const landscape = !!(plan.width && plan.height && plan.width > plan.height);
            return (
              <Box key={plan.id} sx={{ border: `1px solid ${theme.hairline}`, padding: '8px', backgroundColor: '#FFFFFF' }}>
                <FloorPlanFrame src={planSrcs[i]} width={innerW - 18} height={planH - 18} rotate={landscape} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 13, letterSpacing: '0.28em', textTransform: 'uppercase', color: style.gold, textAlign: 'center' }}>
        About This Home
      </Box>
      <Box sx={{ width: 40, height: '1px', backgroundColor: style.gold, mx: 'auto', mt: '10px', mb: '18px' }} />
      {listing.description && (
        <Box sx={{ fontFamily: LUXE_FONTS.spectral, fontSize: 18, lineHeight: 1.7, color: theme.ink, display: '-webkit-box', WebkitLineClamp: 12, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {listing.description}
        </Box>
      )}
    </Box>
  );
}

function FrontCover({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const rowSrcs = [1, 2, 3].map((i) => resolveBrochureSrc(photos, imageMap, i)).filter(Boolean);
  const specRows = buildSpecRows(listing, showPrice);
  const tagline = listing.property_type ? `A ${listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)}` : 'A Private Residence';

  const headerH = 100;
  const heroH = 360;
  const rowH = 130;
  const agentH = 90;
  const innerH = H - SAFE_INSET * 2;
  const gaps = 20 * 4;
  const specH = innerH - headerH - heroH - rowH - agentH - gaps;

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: `1px solid ${theme.hairline}` }}>
      {/* Header */}
      <Box sx={{ height: headerH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: HALF - SAFE_INSET * 2 - 40, textAlign: 'center' }}>
          <AutoFitText maxFontSize={38} minFontSize={20} maxLines={2} fontFamily={LUXE_FONTS.grand} fontWeight={400} color={theme.ink} lineHeight={1.1} align="center">
            {formatStreetAddress(listing)}
          </AutoFitText>
        </Box>
        <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.spectral, fontSize: 15, fontStyle: 'italic', color: theme.sub, textAlign: 'center' }}>
          {tagline}
        </Box>
      </Box>

      {/* Hero with gentle scrim */}
      <Box sx={{ position: 'relative', height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(theme.scrim, 0.12)} 0%, ${rgba(theme.scrim, 0)} 20%, ${rgba(theme.scrim, 0)} 80%, ${rgba(theme.scrim, 0.12)} 100%)`, pointerEvents: 'none' }} />
      </Box>

      {/* Photo row with generous gutters */}
      {rowSrcs.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${rowSrcs.length}, 1fr)`, gap: '14px', height: rowH }}>
          {rowSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      {/* Spec ledger (2-column airy) */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <FitScale height={specH} align="center">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '32px', rowGap: '10px', width: '100%' }}>
            {specRows.map((row, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', py: '6px', borderBottom: `1px solid ${theme.hairline}` }}>
                <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.sub }}>
                  {row.label}
                </Box>
                <Box sx={{ fontFamily: LUXE_FONTS.spectral, fontSize: 16, fontWeight: 500, color: theme.ink }}>
                  {row.value}
                </Box>
              </Box>
            ))}
          </Box>
        </FitScale>
      </Box>

      {/* Agent footer */}
      <Box sx={{ height: agentH, display: 'flex', alignItems: 'center', gap: '14px', borderTop: `1px solid ${theme.hairline}`, pt: '12px' }}>
        {realtor.headshot_url ? (
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flex: 'none', border: `1px solid ${style.gold}` }}>
            <Box component="img" src={realtor.headshot_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ) : (
          <Monogram name={realtor.full_name} size={52} theme={theme} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.grand, fontSize: 22, color: theme.ink, lineHeight: 1.1 }}>
            {realtor.full_name}
          </Box>
          <Box sx={{ display: 'flex', gap: '12px', mt: '3px' }}>
            {realtor.brokerage && (
              <Box sx={{ fontFamily: LUXE_FONTS.fashionSans, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
                {realtor.brokerage}
              </Box>
            )}
            {realtor.phone && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 13, fontWeight: 500, color: theme.ink }}>{realtor.phone}</Box>}
          </Box>
        </Box>
        <QrTile slug={listing.slug} size={54} dark={theme.qrDark} light={theme.qrLight} rounded={4} />
      </Box>
    </Box>
  );
}

export default function BookletPromenadeOutside(props: BrochurePageProps) {
  const { w } = BOOKLET_GEOMETRY.basePx;
  return (
    <Box sx={{ width: w, height: H, display: 'flex', backgroundColor: props.theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      <BackCover {...props} />
      <FrontCover {...props} />
    </Box>
  );
}
