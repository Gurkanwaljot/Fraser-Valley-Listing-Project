import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import LogoutIcon from '@mui/icons-material/Logout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRealtorProfile, getRealtorListings, type RealtorListingCard } from '../../services/realtorPortalService';
import { trackMarketingEvent } from '../../services/marketingAnalyticsService';
import type { Realtor } from '../../types/database';

const MotionBox = motion.create(Box);

export default function RealtorPortalPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [realtor, setRealtor] = useState<Realtor | null>(null);
  const [listings, setListings] = useState<RealtorListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const profile = await getRealtorProfile();
      setRealtor(profile);
      if (profile) {
        const data = await getRealtorListings(profile.id);
        setListings(data);
        if (data.length > 0) {
          trackMarketingEvent(data[0].listing.id, 'realtor_portal_view', {
            realtor_id: profile.id,
            listings_count: data.length,
          });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 'appBar',
          backdropFilter: 'blur(16px)',
          bgcolor: 'rgba(5, 5, 5, 0.6)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
            <Box
              component="img"
              src="/Fraser.png"
              alt="Fraser Valley Real Estate Photography"
              sx={{ height: { xs: 32, md: 40 }, width: 'auto' }}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              {realtor && (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                >
                  {realtor.full_name}
                </Typography>
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                Sign Out
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero / Greeting */}
      <Box sx={{ pt: { xs: 12, md: 16 }, pb: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          {loading ? (
            <Box>
              <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
              <Skeleton variant="text" width={320} height={48} />
              <Skeleton variant="text" width={240} sx={{ mt: 1 }} />
            </Box>
          ) : (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>
                Your Portfolio
              </Typography>
              <Typography variant="h2" sx={{ color: 'text.primary', fontWeight: 400 }}>
                {realtor ? `Welcome back, ${realtor.full_name.split(' ')[0]}` : 'Your Listings'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 560 }}>
                Access your property media, view listings, and download high-resolution assets.
              </Typography>
            </MotionBox>
          )}
        </Container>
      </Box>

      {/* Divider accent */}
      <Container maxWidth="lg">
        <Box sx={{ width: 60, height: '1px', bgcolor: 'primary.main', opacity: 0.4, mb: { xs: 4, md: 6 } }} />
      </Container>

      {/* Content */}
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : listings.length === 0 ? (
          <EmptyState />
        ) : (
          <Grid container spacing={3}>
            {listings.map((item, index) => (
              <Grid key={item.listing.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <ListingCard item={item} index={index} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Footer */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', py: 4 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Fraser Valley Real Estate Photography
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              contact@fraservalleyphotography.pro
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

function ListingCard({ item, index }: { item: RealtorListingCard; index: number }) {
  const navigate = useNavigate();

  return (
    <MotionBox
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'surface.main',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        '&:hover': {
          borderColor: 'rgba(200, 164, 93, 0.3)',
          boxShadow: '0 8px 32px rgba(200, 164, 93, 0.08)',
        },
      }}
    >
      {/* Image */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '16/10',
          overflow: 'hidden',
          bgcolor: 'surface.dark',
        }}
      >
        {item.heroImageUrl ? (
          <Box
            component="img"
            src={item.heroImageUrl}
            alt={item.listing.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease',
              '&:hover': { transform: 'scale(1.03)' },
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(200,164,93,0.05) 0%, rgba(5,5,5,0.8) 100%)',
            }}
          >
            <CameraAltIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          </Box>
        )}
        {/* Status chip overlay */}
        <Chip
          label={item.listing.status === 'active' ? 'Active' : 'Sold'}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            bgcolor: item.listing.status === 'active' ? 'rgba(200,164,93,0.9)' : 'rgba(168,162,158,0.85)',
            color: item.listing.status === 'active' ? 'background.default' : 'background.default',
            backdropFilter: 'blur(4px)',
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 400, mb: 0.5, lineHeight: 1.3 }}>
          {item.listing.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          {item.listing.city}, {item.listing.province_state}
        </Typography>

        {/* Actions */}
        <Stack spacing={1.5}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => navigate(`/listing/${item.listing.slug}`)}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            View Listing
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => navigate(`/realtor/marketing/${item.listing.slug}?t=${item.share.share_token}`)}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            Marketing Kit
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => navigate(`/listing/${item.listing.slug}/download?t=${item.share.share_token}`)}
            sx={{ py: 1.2 }}
          >
            Download Media
          </Button>
        </Stack>
      </Box>
    </MotionBox>
  );
}

function EmptyState() {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      sx={{
        textAlign: 'center',
        py: { xs: 8, md: 12 },
        maxWidth: 480,
        mx: 'auto',
      }}
    >
      <Box sx={{ width: 40, height: '1px', bgcolor: 'primary.main', opacity: 0.4, mx: 'auto', mb: 4 }} />
      <CameraAltIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 3 }} />
      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400, mb: 2 }}>
        No Active Listings
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.7 }}>
        It looks like you don't have any active listings with us right now. Ready to showcase your next property with stunning visuals?
      </Typography>
      <Button
        variant="contained"
        size="large"
        href="https://fraservalleyphotography.pro/booking"
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
        sx={{ py: 1.5, px: 4, mb: 3 }}
      >
        Book Your Next Shoot
      </Button>
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        Questions? Reach us at contact@fraservalleyphotography.pro
      </Typography>
    </MotionBox>
  );
}

function LoadingSkeleton() {
  return (
    <Grid container spacing={3}>
      {[0, 1, 2].map((i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'surface.main',
            }}
          >
            <Skeleton variant="rectangular" sx={{ aspectRatio: '16/10', width: '100%' }} />
            <Box sx={{ p: 2.5 }}>
              <Skeleton variant="text" width="80%" height={28} />
              <Skeleton variant="text" width="50%" sx={{ mb: 2.5 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 1.5 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
