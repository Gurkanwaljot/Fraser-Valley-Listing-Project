import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import BedIcon from '@mui/icons-material/KingBed';
import BathIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeIcon from '@mui/icons-material/Home';
import LandscapeIcon from '@mui/icons-material/Landscape';
import TagIcon from '@mui/icons-material/Tag';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SectionReveal from './SectionReveal';
import type { Listing } from '../../types/database';
import { formatStreetAddress } from '../../services/marketingService';

interface Props {
  listing: Listing;
}

function formatPrice(price: number | null, currency: string): string {
  if (!price) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export default function PublicListingDetails({ listing }: Props) {
  const stats: StatItem[] = ([
    listing.bedrooms ? { icon: <BedIcon />, label: 'Bedrooms', value: `${listing.bedrooms}` } : null,
    listing.bathrooms ? { icon: <BathIcon />, label: 'Bathrooms', value: `${listing.bathrooms}` } : null,
    listing.square_footage ? { icon: <SquareFootIcon />, label: 'Living Area', value: `${listing.square_footage.toLocaleString()} sq. ft.` } : null,
    listing.lot_size ? { icon: <LandscapeIcon />, label: 'Lot Size', value: `${listing.lot_size} sq. ft.` } : null,
    listing.year_built ? { icon: <CalendarTodayIcon />, label: 'Year Built', value: `${listing.year_built}` } : null,
    listing.property_type ? { icon: <HomeIcon />, label: 'Type', value: listing.property_type } : null,
    listing.mls_number ? { icon: <TagIcon />, label: 'MLS', value: listing.mls_number } : null,
  ] as (StatItem | null)[]).filter((d): d is StatItem => d !== null);

  const hasAddress = listing.address_line_1 || listing.city;
  const addressLine = [
    formatStreetAddress(listing),
    listing.city,
    listing.province_state,
    listing.postal_code,
  ].filter(Boolean).join(', ');

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Property Information
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        Details
      </Typography>

      {/* Price + Address header */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          spacing={{ xs: 1, sm: 3 }}
        >
          {listing.price && (
            <Typography
              variant="h3"
              sx={{ color: 'primary.main', fontWeight: 400, letterSpacing: '-0.01em' }}
            >
              {formatPrice(listing.price, listing.currency)}
            </Typography>
          )}
          {hasAddress && (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <LocationOnIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                {addressLine}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Gold separator */}
      {(listing.price || hasAddress) && stats.length > 0 && (
        <Box sx={{ width: 40, height: '1px', bgcolor: 'primary.main', mb: 4, opacity: 0.6 }} />
      )}

      {/* Stats - open horizontal flow */}
      {stats.length > 0 && (
        <Stack
          direction="row"
          sx={{
            mb: 4,
            flexWrap: 'wrap',
            gap: { xs: 3, md: 0 },
          }}
        >
          {stats.map((item, index) => (
            <Stack
              key={item.label}
              direction="row"
              alignItems="center"
              spacing={0}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              {index > 0 && (
                <Box
                  sx={{
                    width: '1px',
                    height: 28,
                    bgcolor: 'divider',
                    mx: { xs: 0, md: 3 },
                    display: { xs: 'none', md: 'block' },
                  }}
                />
              )}
              <Stack alignItems="center" spacing={0.5}>
                <Box sx={{ color: 'primary.main', opacity: 0.7, '& svg': { fontSize: 20 } }}>
                  {item.icon}
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: 'text.primary', fontWeight: 400, lineHeight: 1.2 }}
                >
                  {item.value}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  {item.label}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      {/* Description + Features */}
      {(listing.description || listing.features.length > 0) && (
        <Box sx={{ maxWidth: 800 }}>
          {listing.description && (
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                whiteSpace: 'pre-line',
                lineHeight: 2,
                fontWeight: 400,
              }}
            >
              {listing.description}
            </Typography>
          )}

          {listing.description && listing.features.length > 0 && (
            <Divider sx={{ my: 3 }} />
          )}

          {listing.features.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', mb: 2, display: 'block', letterSpacing: '0.1em' }}
              >
                Features
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {listing.features.map((feature) => (
                  <Chip
                    key={feature}
                    label={feature}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.04)',
                      color: 'text.secondary',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      '&:hover': { borderColor: 'primary.main', color: 'text.primary' },
                      transition: (theme) => theme.transitions.create(['border-color', 'color'], {
                        duration: theme.transitions.duration.shorter,
                      }),
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </SectionReveal>
  );
}
