import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CameraEnhanceIcon from '@mui/icons-material/CameraEnhance';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import MovieIcon from '@mui/icons-material/Movie';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

const heroImages = ['/hero-home.webp', '/hero-interior.webp', '/hero-aerial.webp'];

const services = [
  {
    icon: <CameraEnhanceIcon sx={{ fontSize: 32 }} />,
    title: 'Interior & Exterior Photography',
    description: 'Professional photography that captures every detail of your property in stunning clarity with high-end equipment and expert techniques.',
  },
  {
    icon: <FlightTakeoffIcon sx={{ fontSize: 32 }} />,
    title: 'Drone Photography & Videography',
    description: 'Breathtaking aerial perspectives that showcase property features, surrounding areas, and neighborhood context.',
  },
  {
    icon: <MovieIcon sx={{ fontSize: 32 }} />,
    title: 'Real Estate Video',
    description: 'Engaging video content in both portrait and landscape formats. Perfect for social media marketing and MLS listings.',
  },
  {
    icon: <ViewInArIcon sx={{ fontSize: 32 }} />,
    title: 'Floor Plans & Virtual Tours',
    description: 'Accurate, professional floor plans in 2D, 3D, and interactive formats. Help buyers visualize space and flow.',
  },
  {
    icon: <DownloadIcon sx={{ fontSize: 32 }} />,
    title: 'Secure Media Delivery',
    description: 'OTP-verified download centers ensure realtors get full-resolution media packages securely and instantly.',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 32 }} />,
    title: 'Analytics Dashboard',
    description: 'Track views, engagement, downloads, and leads across all your listings in real time.',
  },
];

const valueProps = [
  {
    icon: <AccessTimeIcon sx={{ fontSize: 28, color: 'primary.main' }} />,
    title: 'Fast Turnaround',
    description: '24-48 hour delivery on most services',
  },
  {
    icon: <VerifiedIcon sx={{ fontSize: 28, color: 'primary.main' }} />,
    title: 'Professional Quality',
    description: 'High-end equipment and expert photographers',
  },
  {
    icon: <PlaceIcon sx={{ fontSize: 28, color: 'primary.main' }} />,
    title: 'Local Expertise',
    description: 'Serving Fraser Valley for years',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
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
              sx={{ height: { xs: 36, md: 44 }, width: 'auto' }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="text"
                onClick={() => navigate('/realtor-access')}
                sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Realtor Access
              </Button>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: 'text.secondary' }}
              >
                Photographer Login
              </Button>
              <Button
                variant="contained"
                size="small"
                href="https://fraservalleyphotography.pro/booking"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book Now
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero Section with Image Carousel */}
      <Box sx={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        {/* Background Images */}
        <AnimatePresence mode="wait">
          <MotionBox
            key={currentImage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            sx={{
              position: 'absolute',
              inset: 0,
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.4) 40%, rgba(5,5,5,0.8) 100%)',
              },
            }}
          >
            <Box
              component="img"
              src={heroImages[currentImage]}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </MotionBox>
        </AnimatePresence>

        {/* Hero Content */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ maxWidth: 720, pt: 10 }}>
            <MotionBox
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', mb: 2, display: 'block', fontSize: '0.75rem' }}
              >
                Fraser Valley Real Estate Photography
              </Typography>
            </MotionBox>

            <MotionTypography
              variant="h1"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              sx={{
                color: 'text.primary',
                mb: 3,
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 400,
                lineHeight: 1.05,
              }}
            >
              Transforming Your Spaces{' '}
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 400 }}>
                Into Visual Stories
              </Box>
            </MotionTypography>

            <MotionBox
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'text.secondary',
                  maxWidth: 540,
                  mb: 5,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                Elevate your listings with stunning visuals that sell.
                Professional photography, drone aerials, cinematic video,
                and secure media delivery for Fraser Valley realtors.
              </Typography>
            </MotionBox>

            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Button
                  variant="contained"
                  size="large"
                  href="https://fraservalleyphotography.pro/booking"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ px: 5, py: 1.5, fontSize: '0.95rem' }}
                >
                  Book Your Shoot
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="https://fraservalleyphotography.pro/portfolio"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ px: 5, py: 1.5, fontSize: '0.95rem' }}
                >
                  View Portfolio
                </Button>
              </Stack>
            </MotionBox>
          </Box>
        </Container>

        {/* Image Indicators */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        >
          {heroImages.map((_, index) => (
            <Box
              key={index}
              onClick={() => setCurrentImage(index)}
              sx={{
                width: index === currentImage ? 32 : 8,
                height: 8,
                borderRadius: 4,
                bgcolor: index === currentImage ? 'primary.main' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.4s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Services Section */}
      <Box sx={{ py: { xs: 10, md: 14 }, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(200,164,93,0.3), transparent)',
          }}
        />
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
              <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>
                Our Services
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 400,
                  mb: 2,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                Comprehensive photography solutions for real estate professionals
              </Typography>
            </Box>
          </MotionBox>

          <Grid container spacing={3}>
            {services.map((service, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.title}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Box
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'surface.main',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 32px rgba(200, 164, 93, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                      {service.icon}
                    </Box>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1.5 }}>
                      {service.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {service.description}
                    </Typography>
                  </Box>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Value Propositions */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {valueProps.map((prop, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={prop.title}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  sx={{ textAlign: 'center' }}
                >
                  {prop.icon}
                  <Typography variant="h6" sx={{ color: 'text.primary', mt: 1.5, mb: 0.5 }}>
                    {prop.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {prop.description}
                  </Typography>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Showcase Image Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                aspectRatio: '21/9',
              }}
            >
              <Box
                component="img"
                src="/hero-aerial.webp"
                alt="Aerial view of Fraser Valley"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(5,5,5,0.7) 0%, transparent 60%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: { xs: 4, md: 8 },
                }}
              >
                <Typography variant="overline" sx={{ color: 'primary.main', mb: 1 }}>
                  Servicing Fraser Valley and Lower Mainland
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    maxWidth: 520,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  Surrey, Vancouver, Abbotsford, Mission, Chilliwack, Langley, Coquitlam & More
                </Typography>
              </Box>
            </Box>
          </MotionBox>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 10, md: 14 } }}>
        <Container maxWidth="sm">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            sx={{ textAlign: 'center' }}
          >
            <Typography
              variant="h3"
              sx={{
                color: 'text.primary',
                fontWeight: 400,
                mb: 2,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              Ready to Showcase Your Property?
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.8 }}>
              Book your professional photography shoot today and get stunning results in 24-48 hours.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                href="https://fraservalleyphotography.pro/booking"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ px: 5, py: 1.5 }}
              >
                Schedule Your Shoot
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ px: 5, py: 1.5 }}
              >
                Photographer Login
              </Button>
            </Stack>
          </MotionBox>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                component="img"
                src="/Fraser.png"
                alt="Fraser Valley Real Estate Photography"
                sx={{ height: 60, width: 'auto', mb: 1.5 }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 280 }}>
                Transforming spaces with stunning photography.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Link
                    href="tel:1-236-613-0126"
                    underline="hover"
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                  >
                    1-236-613-0126
                  </Link>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Link
                    href="mailto:contact@fraservalleyphotography.pro"
                    underline="hover"
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                  >
                    contact@fraservalleyphotography.pro
                  </Link>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                <Link
                  href="https://fraservalleyphotography.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  variant="body2"
                  sx={{ color: 'primary.main' }}
                >
                  fraservalleyphotography.pro
                </Link>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  &copy; 2026 Fraser Valley Real Estate Photography. All rights reserved.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
