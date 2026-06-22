import Box from '@mui/material/Box';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import BedOutlined from '@mui/icons-material/BedOutlined';
import BathtubOutlined from '@mui/icons-material/BathtubOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import CropFreeOutlined from '@mui/icons-material/CropFreeOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Listing } from '../../../../types/database';
import type { LuxeTheme } from '../../socialPosts/theme';
import { brochureStyle } from '../brochureTypes';
import { formatPrice, formatCurrencyCents } from '../../../../services/marketingService';
import { toTitleCase } from '../../socialPosts/templateTypes';
import AutoFitText from '../../socialPosts/components/AutoFitText';

interface SpecIconGridProps {
  listing: Listing;
  theme: LuxeTheme;
  showPrice: boolean;
}

interface Fact {
  icon: SvgIconComponent;
  label: string;
  value: string;
  accent?: boolean;
}

const LABEL_FONT_SIZE = 12;
const LABEL_LINE_HEIGHT = 1.2;
const VALUE_FONT_SIZE = 22;
const VALUE_LINE_HEIGHT = 1.1;
const VALUE_GAP = 2;
// Icon height matches the stacked label + value so the tile reads as one unit.
const ICON_SIZE = Math.round(
  LABEL_FONT_SIZE * LABEL_LINE_HEIGHT + VALUE_GAP + VALUE_FONT_SIZE * VALUE_LINE_HEIGHT,
);
// Sized so four tiles fit one row within the booklet's ~762px inner width (with the 28px column gap).
const TILE_WIDTH = 168;

export default function SpecIconGrid({ listing, theme, showPrice }: SpecIconGridProps) {
  const style = brochureStyle(theme);

  const facts: Fact[] = [];
  if (showPrice && listing.price) {
    facts.push({ icon: SellOutlined, label: 'Price', value: formatPrice(listing.price, listing.currency), accent: true });
  }
  facts.push(
    { icon: HomeWorkOutlined, label: 'Type', value: listing.property_type ? toTitleCase(listing.property_type) : 'N/A' },
    { icon: BedOutlined, label: 'Bedrooms', value: listing.bedrooms != null ? String(listing.bedrooms) : 'N/A' },
    { icon: BathtubOutlined, label: 'Bathrooms', value: listing.bathrooms != null ? String(listing.bathrooms) : 'N/A' },
    { icon: CalendarMonthOutlined, label: 'Year Built', value: listing.year_built != null ? String(listing.year_built) : 'N/A' },
    { icon: SquareFootOutlined, label: 'Living Area', value: listing.square_footage != null ? `${listing.square_footage.toLocaleString()} sq. ft.` : 'N/A' },
    { icon: CropFreeOutlined, label: 'Lot Size', value: listing.lot_size ? `${listing.lot_size} sq. ft.` : 'N/A' },
    { icon: ReceiptLongOutlined, label: 'Prop. Tax', value: listing.property_taxes != null ? formatCurrencyCents(listing.property_taxes, listing.currency) : 'N/A' },
  );

  return (
    <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '28px', rowGap: '16px', alignItems: 'flex-start' }}>
      {facts.map((fact) => {
        const Icon = fact.icon;
        return (
          <Box
            key={fact.label}
            sx={{ width: TILE_WIDTH, display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `1px solid ${theme.hairline}`, paddingBottom: '14px' }}
          >
            <Icon sx={{ fontSize: ICON_SIZE, color: style.gold, flex: 'none' }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  fontFamily: style.labelFont,
                  fontSize: LABEL_FONT_SIZE,
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  lineHeight: LABEL_LINE_HEIGHT,
                  color: theme.sub,
                }}
              >
                {fact.label}
              </Box>
              <Box sx={{ mt: `${VALUE_GAP}px` }}>
                <AutoFitText
                  maxFontSize={VALUE_FONT_SIZE}
                  minFontSize={13}
                  maxLines={1}
                  fontFamily={style.valueFont}
                  fontWeight={style.valueWeight}
                  lineHeight={VALUE_LINE_HEIGHT}
                  color={fact.accent ? style.gold : theme.ink}
                >
                  {fact.value}
                </AutoFitText>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
