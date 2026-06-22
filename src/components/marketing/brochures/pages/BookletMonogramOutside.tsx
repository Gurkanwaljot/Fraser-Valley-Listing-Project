import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, SAFE_INSET, brochureStyle, resolveFloorPlanSrc, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import { rgba } from '../../socialPosts/blend';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import FitScale from '../../socialPosts/components/FitScale';
import AutoFitText from '../../socialPosts/components/AutoFitText';
import SpecIconGrid from '../components/SpecIconGrid';
import FloorPlanFrame from '../components/FloorPlanFrame';
import Monogram from '../components/Monogram';
import QrTile from '../../socialPosts/components/QrTile';

const HALF = BOOKLET_GEOMETRY.foldX;
const H = BOOKLET_GEOMETRY.basePx.h;

function BackCover({ listing, floorPlans, imageMap, theme, realtor }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const innerW = HALF - SAFE_INSET * 2;

  if (floorPlans.length > 0) {
    const plans = floorPlans.slice(0, 3);
    const planSrcs = plans.map((p) => resolveFloorPlanSrc(p, imageMap));
    const stackH = H - SAFE_INSET * 2 - 90;
    const planH = Math.floor((stackH - (plans.length - 1) * 16) / plans.length);
    return (
      <Box sx={{ width: HALF, height: H, backgroundColor: '#FFFFFF', padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Monogram name={realtor.full_name} size={52} theme={theme} />
        <Box sx={{ mt: '10px', fontFamily: LUXE_FONTS.didone, fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold, textAlign: 'center' }}>
          Floor Plans
        </Box>
        <Box sx={{ width: 50, height: '1px', backgroundColor: style.gold, mt: '10px', mb: '16px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {plans.map((plan, i) => {
            const landscape = !!(plan.width && plan.height && plan.width > plan.height);
            return (
              <Box key={plan.id} sx={{ border: `1px solid ${theme.hairline}`, padding: '6px', backgroundColor: '#FFFFFF' }}>
                <FloorPlanFrame src={planSrcs[i]} width={innerW - 12} height={planH - 12} rotate={landscape} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ textAlign: 'center', mb: '16px' }}>
        <Monogram name={realtor.full_name} size={52} theme={theme} />
      </Box>
      <Box sx={{ fontFamily: style.labelFont, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold, mb: '6px', textAlign: 'center' }}>
        About This Home
      </Box>
      <Box sx={{ width: 50, height: '1px', backgroundColor: style.gold, mx: 'auto', mb: '18px' }} />
      {listing.description && (
        <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 18, lineHeight: 1.55, color: theme.ink, display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  const headerH = 130;
  const heroH = 370;
  const rowH = 140;
  const agentH = 100;
  const innerH = H - SAFE_INSET * 2;
  const gaps = 20 * 4;
  const specH = innerH - headerH - heroH - rowH - agentH - gaps;

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: `1px solid ${theme.hairline}` }}>
      {/* Header with monogram crest */}
      <Box sx={{ height: headerH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Monogram name={realtor.full_name} size={58} theme={theme} />
        <Box sx={{ mt: '10px', width: '100%', textAlign: 'center' }}>
          <AutoFitText maxFontSize={38} minFontSize={20} maxLines={2} fontFamily={LUXE_FONTS.didone} fontWeight={400} color={theme.ink} lineHeight={1.06} align="center">
            {formatStreetAddress(listing)}
          </AutoFitText>
        </Box>
        {cityState && (
          <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.label, fontSize: 13, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: theme.sub, textAlign: 'center' }}>
            {cityState}
          </Box>
        )}
      </Box>

      {/* Hero */}
      <Box sx={{ position: 'relative', height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(theme.scrim, 0)} 70%, ${rgba(theme.scrim, 0.2)} 100%)`, pointerEvents: 'none' }} />
      </Box>

      {/* Photo row */}
      {rowSrcs.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${rowSrcs.length}, 1fr)`, gap: '8px', height: rowH }}>
          {rowSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      {/* Spec grid */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FitScale height={specH} align="center">
          <SpecIconGrid listing={listing} theme={theme} showPrice={showPrice} />
        </FitScale>
      </Box>

      {/* Agent footer */}
      <Box sx={{ height: agentH, display: 'flex', alignItems: 'center', gap: '16px', borderTop: `1px solid ${theme.hairline}`, pt: '14px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.didone, fontSize: 26, color: theme.ink, lineHeight: 1.05 }}>
            {realtor.full_name}
          </Box>
          {realtor.brokerage && (
            <Box sx={{ mt: '4px', fontFamily: style.labelFont, fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          )}
          {realtor.phone && (
            <Box sx={{ mt: '3px', fontFamily: LUXE_FONTS.body, fontSize: 15, fontWeight: 500, color: theme.ink }}>{realtor.phone}</Box>
          )}
        </Box>
        <QrTile slug={listing.slug} size={62} dark={theme.qrDark} light={theme.qrLight} rounded={6} />
      </Box>
    </Box>
  );
}

export default function BookletMonogramOutside(props: BrochurePageProps) {
  const { w } = BOOKLET_GEOMETRY.basePx;
  return (
    <Box sx={{ width: w, height: H, display: 'flex', backgroundColor: props.theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      <BackCover {...props} />
      <FrontCover {...props} />
    </Box>
  );
}
