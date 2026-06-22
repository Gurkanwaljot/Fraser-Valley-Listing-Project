import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, SAFE_INSET, brochureStyle, resolveFloorPlanSrc, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import { rgba } from '../../socialPosts/blend';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import FitScale from '../../socialPosts/components/FitScale';
import SpecIconGrid from '../components/SpecIconGrid';
import FloorPlanFrame from '../components/FloorPlanFrame';
import Monogram from '../components/Monogram';
import QrTile from '../../socialPosts/components/QrTile';

const HALF = BOOKLET_GEOMETRY.foldX;
const H = BOOKLET_GEOMETRY.basePx.h;

function BackCover({ listing, photos, floorPlans, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const innerW = HALF - SAFE_INSET * 2;
  const features = (listing.features || []).slice(0, 8);

  if (floorPlans.length > 0) {
    const plans = floorPlans.slice(0, 3);
    const planSrcs = plans.map((p) => resolveFloorPlanSrc(p, imageMap));
    const stackH = H - SAFE_INSET * 2 - 70;
    const planH = Math.floor((stackH - (plans.length - 1) * 16) / plans.length);
    return (
      <Box sx={{ width: HALF, height: H, backgroundColor: '#FFFFFF', padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ fontFamily: style.labelFont, fontSize: 15, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold, mb: '6px' }}>
          Floor Plans
        </Box>
        <Box sx={{ width: 70, height: '3px', backgroundColor: style.gold, mb: '20px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map((plan, i) => {
            const landscape = !!(plan.width && plan.height && plan.width > plan.height);
            return (
              <Box key={plan.id} sx={{ border: '1px solid rgba(0,0,0,0.12)', padding: '8px', backgroundColor: '#FFFFFF' }}>
                <FloorPlanFrame src={planSrcs[i]} width={innerW - 16} height={planH - 16} rotate={landscape} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  const photoSrc = resolveBrochureSrc(photos, imageMap, Math.max(0, photos.length - 1));
  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ fontFamily: style.labelFont, fontSize: 15, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold, mb: '6px' }}>
        About This Home
      </Box>
      <Box sx={{ width: 70, height: '3px', backgroundColor: style.gold, mb: '20px' }} />
      {listing.description && (
        <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 19, lineHeight: 1.55, color: theme.ink, mb: '24px', display: '-webkit-box', WebkitLineClamp: 9, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {listing.description}
        </Box>
      )}
      {features.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '24px', rowGap: '10px', mb: '24px' }}>
          {features.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontFamily: LUXE_FONTS.body, fontSize: 16, color: theme.ink }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: style.gold, flex: 'none', transform: 'translateY(-3px)' }} />
              {f}
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <PhotoFrame src={photoSrc} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
      </Box>
    </Box>
  );
}

function FrontCover({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const rowSrcs = [1, 2, 3].map((i) => resolveBrochureSrc(photos, imageMap, i)).filter(Boolean);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');

  const heroH = 380;
  const rowH = 150;
  const agentH = 140;
  const innerH = H - SAFE_INSET * 2;
  const headerH = 110;
  const gaps = 24 * 4;
  const specH = innerH - headerH - heroH - rowH - agentH - gaps;

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: `1px solid ${theme.hairline}` }}>
      <Box sx={{ height: headerH }}>
        <Box sx={{ fontFamily: style.labelFont, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold }}>
          For Sale
        </Box>
        <Box sx={{ mt: '8px', fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 40, lineHeight: 1.02, color: theme.ink }}>
          {formatStreetAddress(listing)}
        </Box>
        {cityState && (
          <Box sx={{ mt: '6px', fontFamily: LUXE_FONTS.body, fontSize: 16, color: theme.sub }}>{cityState}</Box>
        )}
      </Box>

      <Box sx={{ position: 'relative', height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(theme.scrim, 0)} 60%, ${rgba(theme.scrim, 0.3)} 100%)`, pointerEvents: 'none' }} />
      </Box>

      {rowSrcs.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${rowSrcs.length}, 1fr)`, gap: '8px', height: rowH }}>
          {rowSrcs.map((src, i) => (
            <PhotoFrame key={i} src={src} width="100%" height="100%" objectFit="cover" backgroundColor={theme.panel} />
          ))}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FitScale height={specH} align="flex-start">
          <SpecIconGrid listing={listing} theme={theme} showPrice={showPrice} />
        </FitScale>
      </Box>

      <Box sx={{ height: agentH, display: 'flex', alignItems: 'center', gap: '20px', borderTop: `1px solid ${theme.hairline}`, pt: '18px' }}>
        <Monogram name={realtor.full_name} size={84} theme={theme} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ fontFamily: style.titleFont, fontWeight: style.titleWeight, fontSize: 32, color: theme.ink, lineHeight: 1.05 }}>
            {realtor.full_name}
          </Box>
          {realtor.brokerage && (
            <Box sx={{ mt: '4px', fontFamily: style.labelFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: style.gold }}>
              {realtor.brokerage}
            </Box>
          )}
          {realtor.phone && (
            <Box sx={{ mt: '4px', fontFamily: LUXE_FONTS.body, fontSize: 16, fontWeight: 500, color: theme.ink }}>{realtor.phone}</Box>
          )}
          {realtor.email && (
            <Box sx={{ mt: '2px', fontFamily: LUXE_FONTS.body, fontSize: 14, color: theme.sub }}>{realtor.email}</Box>
          )}
        </Box>
        <Box sx={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <QrTile slug={listing.slug} size={72} dark={theme.qrDark} light={theme.qrLight} rounded={6} />
          <Box sx={{ fontFamily: style.labelFont, fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.sub }}>
            Scan for details
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function BookletSpreadOutside(props: BrochurePageProps) {
  const { w } = BOOKLET_GEOMETRY.basePx;
  return (
    <Box sx={{ width: w, height: H, display: 'flex', backgroundColor: props.theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      <BackCover {...props} />
      <FrontCover {...props} />
    </Box>
  );
}
