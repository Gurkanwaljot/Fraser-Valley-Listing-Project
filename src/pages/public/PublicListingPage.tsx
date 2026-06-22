import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicListing } from '../../hooks/usePublicListing';
import { trackListingEvent, setTrackingUserId } from '../../services/publicListingService';
import { useAuth } from '../../hooks/useAuth';
import { usePageDuration } from '../../hooks/usePageDuration';
import { useScrollDepth } from '../../hooks/useScrollDepth';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import PublicListingHero from '../../components/public/PublicListingHero';
import PublicListingNav from '../../components/public/PublicListingNav';
import PublicListingGallery from '../../components/public/PublicListingGallery';
import PublicListingVideos from '../../components/public/PublicListingVideos';
import PublicListingDetails from '../../components/public/PublicListingDetails';
import PublicListingMap from '../../components/public/PublicListingMap';
import PublicListingDocuments from '../../components/public/PublicListingDocuments';
import PublicListingContact from '../../components/public/PublicListingContact';
import PublicListingFloorPlan from '../../components/public/PublicListingFloorPlan';
import PublicListingInteractiveFloorPlan from '../../components/public/PublicListingInteractiveFloorPlan';
import PublicListingFooter from '../../components/public/PublicListingFooter';
import ListingSEO from '../../components/public/ListingSEO';

const DEFAULT_SECTION_ORDER = [
  'photos', 'video', 'floor_plan', 'interactive_floor_plan', 'details', 'map', 'documents', 'contact',
];

const MIN_LOADING_TIME = 1800;
const HERO_PRELOAD_TIMEOUT = 4000;

const MotionBox = motion.create(Box);

export default function PublicListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { data, isPending, isFetching, isError } = usePublicListing(slug);
  const { user } = useAuth();
  const viewTracked = useRef(false);

  const [activeSection, setActiveSection] = useState('photos');
  const [heroReady, setHeroReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const photographerId = data?.listing?.photographer_id ?? null;
  const listingId = data?.listing?.id ?? null;
  const isPreviewMode = data?.isPreview ?? false;

  useEffect(() => {
    if (user?.id) setTrackingUserId(user.id);
  }, [user?.id]);

  usePageDuration(listingId, photographerId, isPreviewMode);
  useScrollDepth(listingId, photographerId, isPreviewMode);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!data) return;

    const media = data.media;
    const heroMedia = media.find((m) => m.is_hero) ?? media.find((m) => m.kind === 'photo') ?? null;
    const heroUrl = heroMedia?.public_url || heroMedia?.thumbnail_url;

    if (!heroUrl) {
      setHeroReady(true);
      return;
    }

    const img = new Image();
    const timeout = setTimeout(() => setHeroReady(true), HERO_PRELOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeout);
      setHeroReady(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      setHeroReady(true);
    };
    img.src = heroUrl;

    return () => clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    if (data && !viewTracked.current && !data.isPreview) {
      const shareToken = searchParams.get('t') || searchParams.get('token');
      const metadata: Record<string, unknown> = {};
      if (shareToken) metadata.share_token = shareToken;
      trackListingEvent(data.listing.id, 'view', metadata, data.listing.photographer_id);
      viewTracked.current = true;
    }
  }, [data, searchParams]);

  const showLoading = isPending || (!data && isFetching) || !heroReady || !minTimeElapsed;

  if (isError && !isPending) {
    return <PublicListingNotFound />;
  }

  if (!data && !isPending && !isFetching) {
    return <PublicListingNotFound />;
  }

  const listing = data?.listing;
  const media = data?.media ?? [];
  const realtors = data?.realtors ?? [];
  const primaryRealtorId = data?.primaryRealtorId ?? null;
  const isPreview = data?.isPreview ?? false;

  const photos = media.filter((m) => m.kind === 'photo');
  const videos = media.filter((m) => m.kind === 'video');
  const documents = media.filter((m) => m.kind === 'document');
  const floorPlans = media.filter((m) => m.kind === 'floor_plan');
  const heroMedia = media.find((m) => m.is_hero) ?? photos[0] ?? null;
  const primaryRealtor = realtors.find((r) => r.id === primaryRealtorId) ?? realtors[0] ?? null;
  const sectionOrder = listing?.section_order || DEFAULT_SECTION_ORDER;
  const hiddenSections = listing?.hidden_sections || ['documents'];

  const sectionConfig: Record<string, { label: string; show: boolean }> = {
    photos: { label: 'Photos', show: photos.length > 0 && !hiddenSections.includes('photos') },
    video: { label: 'Video', show: videos.length > 0 && !hiddenSections.includes('video') },
    floor_plan: { label: 'Floor Plans', show: floorPlans.length > 0 && !hiddenSections.includes('floor_plan') },
    interactive_floor_plan: { label: 'Tour', show: !!listing?.interactive_floor_plan_embed && !hiddenSections.includes('interactive_floor_plan') },
    details: { label: 'Details', show: !hiddenSections.includes('details') },
    map: { label: 'Map', show: !hiddenSections.includes('map') },
    documents: { label: 'Documents', show: documents.length > 0 && !hiddenSections.includes('documents') },
    contact: { label: 'Contact', show: realtors.length > 0 && !hiddenSections.includes('contact') },
  };

  const sections = sectionOrder
    .filter((id) => sectionConfig[id]?.show)
    .map((id) => ({ id, label: sectionConfig[id].label }));

  const renderSection = (sectionId: string) => {
    if (!listing) return null;
    switch (sectionId) {
      case 'photos':
        return photos.length > 0 ? (
          <Box component="section" id="photos" key="photos" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="xl">
              <PublicListingGallery photos={photos} listingId={listing.id} photographerId={listing.photographer_id} />
            </Container>
          </Box>
        ) : null;

      case 'video':
        return videos.length > 0 ? (
          <Box component="section" id="video" key="video" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth={videos.length === 1 ? 'xl' : 'lg'}>
              <PublicListingVideos videos={videos} listingId={listing.id} />
            </Container>
          </Box>
        ) : null;

      case 'floor_plan':
        return floorPlans.length > 0 ? (
          <Box component="section" id="floor_plan" key="floor_plan" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="xl">
              <PublicListingFloorPlan floorPlans={floorPlans} />
            </Container>
          </Box>
        ) : null;

      case 'interactive_floor_plan':
        return listing.interactive_floor_plan_embed ? (
          <Box component="section" id="interactive_floor_plan" key="interactive_floor_plan" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="xl">
              <PublicListingInteractiveFloorPlan embedCode={listing.interactive_floor_plan_embed} />
            </Container>
          </Box>
        ) : null;

      case 'details':
        return (
          <Box component="section" id="details" key="details" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="lg">
              <PublicListingDetails listing={listing} />
            </Container>
          </Box>
        );

      case 'map':
        return (
          <Box component="section" id="map" key="map" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="xl">
              <PublicListingMap listing={listing} />
            </Container>
          </Box>
        );

      case 'documents':
        return documents.length > 0 ? (
          <Box component="section" id="documents" key="documents" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="lg">
              <PublicListingDocuments documents={documents} listingId={listing.id} />
            </Container>
          </Box>
        ) : null;

      case 'contact':
        return realtors.length > 0 ? (
          <Box component="section" id="contact" key="contact" sx={{ py: { xs: 5, md: 8 } }}>
            <Container maxWidth="lg">
              <PublicListingContact
                listing={listing}
                realtors={realtors}
                primaryRealtor={primaryRealtor}
              />
            </Container>
          </Box>
        ) : null;

      default:
        return null;
    }
  };

  const visibleSections = sectionOrder.filter((id) => sectionConfig[id]?.show);

  const loadingAddress = listing
    ? [listing.address_line_2 ? `${listing.address_line_2} - ${listing.address_line_1}` : listing.address_line_1, listing.city, listing.province_state].filter(Boolean).join(', ')
    : undefined;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AnimatePresence mode="wait">
        {showLoading ? (
          <PublicListingLoading
            key="loader"
            address={loadingAddress}
          />
        ) : listing ? (
          <MotionBox
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
          >
            {!isPreview && <ListingSEO listing={listing} media={media} realtors={realtors} />}

            {isPreview && (
              <Alert
                severity="warning"
                variant="filled"
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: (theme) => theme.zIndex.modal + 1,
                  borderRadius: 0,
                  justifyContent: 'center',
                  py: 0.5,
                }}
              >
                Preview Mode - This listing is not publicly visible (status: {listing.status})
              </Alert>
            )}

            {listing.status === 'sold' && !isPreview && (
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: (theme) => theme.zIndex.appBar + 2,
                  bgcolor: 'rgba(5, 5, 5, 0.9)',
                  backdropFilter: 'blur(8px)',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box sx={{ width: 24, height: '1px', bgcolor: 'primary.main', opacity: 0.6 }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.main', letterSpacing: '0.15em', fontSize: '0.65rem' }}
                >
                  Sold
                </Typography>
                <Box sx={{ width: 24, height: '1px', bgcolor: 'primary.main', opacity: 0.6 }} />
              </Box>
            )}

            <PublicListingHero listing={listing} heroMedia={heroMedia} />
            <PublicListingNav
              sections={sections}
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              topOffset={isPreview ? 48 : listing.status === 'sold' ? 36 : 0}
            />

            <Box sx={{ flex: 1 }}>
              {visibleSections.map((sectionId, idx) => (
                <Box key={sectionId}>
                  {idx > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ width: 48, height: '1px', bgcolor: 'divider' }} />
                    </Box>
                  )}
                  <ErrorBoundary fallbackTitle={`Failed to load ${sectionConfig[sectionId]?.label || 'section'}`}>
                    {renderSection(sectionId)}
                  </ErrorBoundary>
                </Box>
              ))}
            </Box>

            <PublicListingFooter />
          </MotionBox>
        ) : null}
      </AnimatePresence>
    </Box>
  );
}

function PublicListingLoading({ address }: { address?: string }) {
  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
    >
      <Box
        sx={{
          bgcolor: 'background.default',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial ambient glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 600,
            height: 600,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(200, 164, 93, 0.03) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              letterSpacing: '0.15em',
              fontSize: '0.6rem',
              textAlign: 'center',
              display: 'block',
            }}
          >
            Fraser Valley Real Estate Photography
          </Typography>
        </motion.div>

        {/* Animated gold line */}
        <Box sx={{ mt: 3, mb: 4, display: 'flex', justifyContent: 'center' }}>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 64, opacity: 1 }}
            transition={{
              width: { duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.4, delay: 0.4 },
            }}
            style={{ height: 1, backgroundColor: '#C8A45D' }}
          />
        </Box>

        {/* Listing context - appears when data is available */}
        <AnimatePresence>
          {address && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: 'text.primary',
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                {address}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );
}

function PublicListingNotFound() {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ width: 48, height: '1px', bgcolor: 'primary.main', opacity: 0.5, mb: 2 }} />
      <Typography variant="h2" sx={{ color: 'text.primary', fontWeight: 400 }}>
        404
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 400 }}>
        This listing could not be found
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6, fontWeight: 400 }}>
        It may have been removed or is no longer active.
      </Typography>
    </Box>
  );
}
