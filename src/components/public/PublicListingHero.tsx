import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { keyframes } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { Listing, MediaAsset } from '../../types/database';

const kenBurns = keyframes`
  0% { transform: scale(1) translate3d(0, 0, 0); }
  100% { transform: scale(1.06) translate3d(-0.5%, -0.5%, 0); }
`;

const pulseDown = keyframes`
  0%, 100% { opacity: 0.4; transform: translateX(-50%) scaleY(1); }
  50% { opacity: 0.8; transform: translateX(-50%) scaleY(1.5); }
`;

interface Props {
  listing: Listing;
  heroMedia: MediaAsset | null;
}

function formatPrice(price: number | null, currency: string): string {
  if (!price) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function PublicListingHero({ listing, heroMedia }: Props) {
  const heroUrl = heroMedia?.large_url || heroMedia?.public_url || heroMedia?.thumbnail_url;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const fullAddress = [
    listing.address_line_2 ? `${listing.address_line_2} - ${listing.address_line_1}` : listing.address_line_1,
    listing.city,
    listing.province_state,
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        setScrollOffset(window.scrollY * 0.4);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const stats = [
    listing.bedrooms ? `${listing.bedrooms} Bed` : null,
    listing.bathrooms ? `${listing.bathrooms} Bath` : null,
    listing.square_footage ? `${listing.square_footage.toLocaleString()} sq. ft.` : null,
  ].filter(Boolean);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '85vh', md: '100vh' },
        minHeight: { xs: 500, md: 600 },
        overflow: 'hidden',
      }}
    >
      {/* Background image with Ken Burns and parallax */}
      {heroUrl && (
        <Box
          component="img"
          src={heroUrl}
          alt={listing.title}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoad={() => setImageLoaded(true)}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '120%',
            objectFit: 'cover',
            animation: `${kenBurns} 30s ease-in-out infinite alternate`,
            transform: `translateY(-${scrollOffset}px)`,
            willChange: scrollOffset > 0 ? 'transform' : 'auto',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.8s ease',
            userSelect: 'none',
            WebkitUserDrag: 'none',
          }}
        />
      )}

      {/* Vignette effect */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5, 5, 5, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Multi-stop gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(
            to bottom,
            rgba(5, 5, 5, 0.15) 0%,
            transparent 25%,
            rgba(5, 5, 5, 0.2) 50%,
            rgba(5, 5, 5, 0.65) 75%,
            rgba(5, 5, 5, 1) 100%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        sx={{
          position: 'absolute',
          bottom: { xs: 100, md: 140 },
          left: 0,
          right: 0,
          px: { xs: 3, sm: 4, md: 6, lg: 8 },
        }}
      >
        <Typography
          variant="overline"
          component={motion.p}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          sx={{
            color: 'primary.main',
            mb: 1.5,
            display: 'block',
            letterSpacing: '0.15em',
          }}
        >
          {listing.property_type || 'Property'}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem', lg: '4rem' },
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          {fullAddress}
        </Typography>

        <Stack
          direction="row"
          spacing={0}
          alignItems="center"
          sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}
        >
          {listing.price && (
            <Typography
              variant="h4"
              sx={{
                color: 'primary.main',
                fontWeight: 400,
                mr: 4,
                letterSpacing: '-0.01em',
              }}
            >
              {formatPrice(listing.price, listing.currency)}
            </Typography>
          )}

          {stats.length > 0 && (
            <Stack direction="row" spacing={0} alignItems="center" sx={{ opacity: 0.8 }}>
              {stats.map((stat, i) => (
                <Box key={stat} sx={{ display: 'flex', alignItems: 'center' }}>
                  {i > 0 && (
                    <Box sx={{ width: '1px', height: 16, bgcolor: 'grey.600', mx: 2 }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'grey.300',
                      letterSpacing: '0.02em',
                      fontWeight: 400,
                    }}
                  >
                    {stat}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Minimal scroll cue - thin line pulse */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          width: '1px',
          height: 32,
          bgcolor: 'common.white',
          animation: `${pulseDown} 2.5s ease-in-out infinite`,
          transformOrigin: 'top center',
        }}
      />
    </Box>
  );
}
