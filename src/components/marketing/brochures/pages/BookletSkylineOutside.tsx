import Box from '@mui/material/Box';
import type { BrochurePageProps } from '../brochureTypes';
import { BOOKLET_GEOMETRY, SAFE_INSET, brochureStyle, buildSpecRows, resolveFloorPlanSrc, resolveBrochureSrc } from '../brochureTypes';
import { LUXE_FONTS } from '../../socialPosts/theme';
import { formatStreetAddress } from '../../../../services/marketingService';
import PhotoFrame from '../../socialPosts/components/PhotoFrame';
import FitScale from '../../socialPosts/components/FitScale';
import FloorPlanFrame from '../components/FloorPlanFrame';
import QrTile from '../../socialPosts/components/QrTile';
import Monogram from '../components/Monogram';

const HALF = BOOKLET_GEOMETRY.foldX;
const H = BOOKLET_GEOMETRY.basePx.h;

function BackCover({ listing, floorPlans, photos, imageMap, theme }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const innerW = HALF - SAFE_INSET * 2;

  if (floorPlans.length > 0) {
    const plans = floorPlans.slice(0, 3);
    const planSrcs = plans.map((p) => resolveFloorPlanSrc(p, imageMap));
    const stackH = H - SAFE_INSET * 2 - 80;
    const planH = Math.floor((stackH - (plans.length - 1) * 14) / plans.length);
    return (
      <Box sx={{ width: HALF, height: H, backgroundColor: '#FFFFFF', padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ fontFamily: LUXE_FONTS.bigShoulders, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.ink }}>
          Drawings / Floor Plans
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: theme.ink, mt: '8px', mb: '16px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          {plans.map((plan, i) => {
            const landscape = !!(plan.width && plan.height && plan.width > plan.height);
            return (
              <Box key={plan.id} sx={{ border: `1px solid ${theme.ink}`, padding: '6px' }}>
                <FloorPlanFrame src={planSrcs[i]} width={innerW - 14} height={planH - 14} rotate={landscape} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (listing.description) {
    return (
      <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ fontFamily: LUXE_FONTS.bigShoulders, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: style.gold }}>
          About This Home
        </Box>
        <Box sx={{ width: '100%', height: '1px', backgroundColor: style.gold, mt: '8px', mb: '18px' }} />
        <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 18, lineHeight: 1.55, color: theme.ink, display: '-webkit-box', WebkitLineClamp: 12, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {listing.description}
        </Box>
      </Box>
    );
  }

  const fallbackSrc = resolveBrochureSrc(photos, imageMap, photos.length > 1 ? 1 : 0);
  return (
    <Box sx={{ width: HALF, height: H, overflow: 'hidden' }}>
      <PhotoFrame src={fallbackSrc} objectFit="cover" backgroundColor={theme.panel} />
    </Box>
  );
}

function FrontCover({ listing, photos, realtor, imageMap, theme, showPrice }: BrochurePageProps) {
  const style = brochureStyle(theme);
  const heroSrc = resolveBrochureSrc(photos, imageMap, 0);
  const cityState = [listing.city, listing.province_state].filter(Boolean).join(', ');
  const specRows = buildSpecRows(listing, showPrice);

  const streetNum = (listing.address_line_1 || '').match(/^\d+/)?.[0] || '';

  const headerH = 160;
  const specBarH = 100;
  const agentH = 80;
  const innerH = H - SAFE_INSET * 2;
  const heroH = innerH - headerH - specBarH - agentH - 36;

  return (
    <Box sx={{ width: HALF, height: H, backgroundColor: theme.bg, padding: `${SAFE_INSET}px`, display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `1px solid ${theme.hairline}` }}>
      {/* Header with big street number */}
      <Box sx={{ height: headerH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {streetNum && (
          <Box sx={{ fontFamily: LUXE_FONTS.bigShoulders, fontSize: 72, fontWeight: 700, lineHeight: 0.9, color: theme.ink, letterSpacing: '-0.02em' }}>
            {streetNum}
          </Box>
        )}
        <Box sx={{ mt: '4px', fontFamily: LUXE_FONTS.label, fontSize: 14, fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', color: theme.sub }}>
          {formatStreetAddress(listing)}
        </Box>
        {cityState && (
          <Box sx={{ mt: '2px', fontFamily: LUXE_FONTS.body, fontSize: 13, color: theme.sub }}>{cityState}</Box>
        )}
      </Box>

      {/* Hero */}
      <Box sx={{ height: heroH, overflow: 'hidden' }}>
        <PhotoFrame src={heroSrc} objectFit="cover" backgroundColor={theme.panel} />
      </Box>

      {/* Spec bar */}
      <Box sx={{ height: specBarH, borderTop: `1px solid ${theme.hairline}`, borderBottom: `1px solid ${theme.hairline}`, display: 'flex', alignItems: 'center', gap: '0' }}>
        <FitScale height={specBarH - 24} align="center">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', width: '100%', flexWrap: 'wrap' }}>
            {specRows.map((row, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? `1px solid ${theme.hairline}` : 'none', px: '8px', minWidth: 0 }}>
                <Box sx={{ fontFamily: LUXE_FONTS.bigShoulders, fontSize: 22, fontWeight: 700, color: theme.ink, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.value}
                </Box>
                <Box sx={{ fontFamily: LUXE_FONTS.label, fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.sub, mt: '2px' }}>
                  {row.label}
                </Box>
              </Box>
            ))}
          </Box>
        </FitScale>
      </Box>

      {/* Agent + QR */}
      <Box sx={{ height: agentH, display: 'flex', alignItems: 'center', gap: '14px' }}>
        {realtor.headshot_url ? (
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flex: 'none', border: `1px solid ${style.gold}` }}>
            <Box component="img" src={realtor.headshot_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ) : (
          <Monogram name={realtor.full_name} size={48} theme={theme} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontFamily: LUXE_FONTS.bigShoulders, fontSize: 20, fontWeight: 700, color: theme.ink, lineHeight: 1.1 }}>
            {realtor.full_name}
          </Box>
          <Box sx={{ display: 'flex', gap: '12px', mt: '2px' }}>
            {realtor.brokerage && (
              <Box sx={{ fontFamily: LUXE_FONTS.label, fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: style.gold }}>
                {realtor.brokerage}
              </Box>
            )}
            {realtor.phone && <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 13, fontWeight: 500, color: theme.ink }}>{realtor.phone}</Box>}
          </Box>
        </Box>
        <QrTile slug={listing.slug} size={52} dark={theme.qrDark} light={theme.qrLight} rounded={4} />
      </Box>
    </Box>
  );
}

export default function BookletSkylineOutside(props: BrochurePageProps) {
  const { w } = BOOKLET_GEOMETRY.basePx;
  return (
    <Box sx={{ width: w, height: H, display: 'flex', backgroundColor: props.theme.bg, overflow: 'hidden', fontFamily: LUXE_FONTS.body }}>
      <BackCover {...props} />
      <FrontCover {...props} />
    </Box>
  );
}
