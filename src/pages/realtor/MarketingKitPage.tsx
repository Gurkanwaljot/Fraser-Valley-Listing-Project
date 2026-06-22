import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import PhotoIcon from '@mui/icons-material/Photo';
import VideocamIcon from '@mui/icons-material/Videocam';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { getMarketingData, getMarketingDataDirect, type MarketingListingData } from '../../services/marketingService';
import { formatStreetAddress } from '../../services/marketingService';
import { trackMarketingEvent } from '../../services/marketingAnalyticsService';
import BrochuresTab from '../../components/marketing/BrochuresTab';
import SocialPostsTab from '../../components/marketing/SocialPostsTab';
import ReelsTab from '../../components/marketing/ReelsTab';

const MotionBox = motion.create(Box);
const MIN_LOADING_MS = 1800;

const TEMPLATE_FONTS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Bodoni Moda',
  'Fraunces',
  'Marcellus',
  'Italiana',
  'Tenor Sans',
  'Jost',
  'Hanken Grotesk',
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`marketing-tabpanel-${index}`} aria-labelledby={`marketing-tab-${index}`}>
      {value === index && <Box sx={{ pt: { xs: 2, sm: 4 } }}>{children}</Box>}
    </div>
  );
}

function MarketingKitLoading({ address }: { address?: string }) {
  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(200,164,93,0.04) 0%, transparent 70%)',
        }}
      />
      <Stack alignItems="center" spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        <MotionBox
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', letterSpacing: '2px', fontSize: '0.7rem' }}
          >
            Marketing Kit
          </Typography>
        </MotionBox>

        <MotionBox
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 64, opacity: 1 }}
          transition={{ width: { duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.4, delay: 0.4 } }}
          sx={{ height: '1px', bgcolor: 'primary.main' }}
        />

        <AnimatePresence>
          {address && (
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {address}
              </Typography>
            </MotionBox>
          )}
        </AnimatePresence>

        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1 }}>
            Preparing templates...
          </Typography>
        </MotionBox>
      </Stack>
    </MotionBox>
  );
}

export default function MarketingKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('t') || '';

  const [data, setData] = useState<MarketingListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fontPromises = TEMPLATE_FONTS.map((f) =>
      document.fonts.load(`400 16px "${f}"`).catch(() => {})
    );
    Promise.all(fontPromises).then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);

  const loadData = useCallback(async () => {
    if (!slug) {
      setError('Missing listing slug.');
      setLoading(false);
      return;
    }

    try {
      if (token) {
        const result = await getMarketingData(slug, token);
        if (!result) {
          setError('Unable to access this listing. The link may be expired or invalid.');
        } else {
          setData(result);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in or use a valid share link to access this page.');
          setLoading(false);
          return;
        }
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        const roles = (userRoles ?? []).map((r: { role: string }) => r.role);
        const isPrivileged = roles.includes('admin') || roles.includes('photographer');
        if (!isPrivileged) {
          setError('Please sign in or use a valid share link to access this page.');
          setLoading(false);
          return;
        }
        const result = await getMarketingDataDirect(slug);
        if (!result) {
          setError('Listing not found.');
        } else {
          setData(result);
        }
      }
    } catch {
      setError('Failed to load listing data.');
    }
    setLoading(false);
  }, [slug, token]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (data?.listing?.id) {
      trackMarketingEvent(data.listing.id, 'marketing_kit_open');
    }
  }, [data?.listing?.id]);

  useEffect(() => {
    if (!data) return;
    const urls: string[] = [];
    data.photos.slice(0, 6).forEach((p) => {
      const u = p.thumbnail_url || p.public_url;
      if (u) urls.push(u);
    });
    urls.forEach((u) => {
      const img = new Image();
      img.src = u;
    });
  }, [data]);

  const showLoading = loading || !minTimeElapsed || (!error && !fontsReady);
  const listingAddress = data ? `${formatStreetAddress(data.listing)}, ${data.listing.city}` : undefined;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <AnimatePresence mode="wait">
      {showLoading && !error ? (
        <MarketingKitLoading key="loader" address={listingAddress} />
      ) : (
        <MotionBox
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
        >
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
                  sx={{ height: { xs: 28, md: 40 }, width: 'auto', maxWidth: '55%' }}
                />
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate(-1)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' }, flexShrink: 0 }}
                >
                  Back
                </Button>
              </Box>
            </Container>
          </Box>

          {/* Header */}
          <Box sx={{ pt: { xs: 11, md: 14 }, pb: { xs: 2, md: 3 } }}>
            <Container maxWidth="lg">
              {error ? (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
              ) : data ? (
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>
                    Marketing Kit
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 400,
                      fontSize: { xs: '1.4rem', sm: '2rem', md: '3rem' },
                      wordBreak: 'break-word',
                    }}
                  >
                    {data.listing.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Generate brochures, social media posts, and video reels for this property.
                  </Typography>
                </MotionBox>
              ) : null}
            </Container>
          </Box>

          {/* Tabs */}
          {data && (
            <Container maxWidth="lg" sx={{ pb: 8 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label="marketing kit tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    '& .MuiTab-root': {
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      px: { xs: 1.5, sm: 2 },
                      minWidth: { xs: 'auto', sm: 90 },
                      '&.Mui-selected': { color: 'primary.main' },
                    },
                    '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                    '& .MuiTabs-scrollButtons': { color: 'text.secondary', '&.Mui-disabled': { opacity: 0.3 } },
                  }}
                >
                  <Tab icon={<DescriptionIcon />} iconPosition="start" label="Brochures" id="marketing-tab-0" aria-controls="marketing-tabpanel-0" />
                  <Tab icon={<PhotoIcon />} iconPosition="start" label="Social Posts" id="marketing-tab-1" aria-controls="marketing-tabpanel-1" />
                  <Tab icon={<VideocamIcon />} iconPosition="start" label="Reels" id="marketing-tab-2" aria-controls="marketing-tabpanel-2" />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <BrochuresTab data={data} />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <SocialPostsTab data={data} />
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <ReelsTab data={data} />
              </TabPanel>
            </Container>
          )}

          {/* Footer */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', py: { xs: 3, sm: 4 } }}>
            <Container maxWidth="lg">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent={{ xs: 'center', sm: 'space-between' }}
                alignItems="center"
                spacing={1}
              >
                <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Fraser Valley Real Estate Photography
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Assets generated are ready for print and social media.
                </Typography>
              </Stack>
            </Container>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  );
}
