import { useState, useCallback, useEffect, useRef, memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { trackListingEvent } from '../../services/publicListingService';
import SectionReveal from './SectionReveal';
import type { MediaAsset } from '../../types/database';

interface Props {
  photos: MediaAsset[];
  listingId: string;
  photographerId?: string | null;
}

function getGridSrc(photo: MediaAsset): string {
  return photo.thumbnail_url || photo.public_url || '';
}

function getFullSrc(photo: MediaAsset): string {
  return photo.large_url || photo.public_url || photo.thumbnail_url || '';
}

export default memo(function PublicListingGallery({ photos, listingId, photographerId }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const viewedPhotos = useRef<Set<string>>(new Set());

  useEffect(() => {
    const viewed = viewedPhotos;
    return () => {
      if (viewed.current.size > 0) {
        const photosViewed = viewed.current.size;
        const totalPhotos = photos.length;
        trackListingEvent(listingId, 'gallery_summary', {
          photos_viewed: photosViewed,
          total_photos: totalPhotos,
          engagement_rate: Math.round((photosViewed / totalPhotos) * 100) / 100,
        }, photographerId);
      }
    };
  }, [listingId, photos.length, photographerId]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    const assetId = photos[index]?.id;
    if (assetId) viewedPhotos.current.add(assetId);
    trackListingEvent(listingId, 'photo_open', { photo_index: index, asset_id: assetId }, photographerId);
  }, [listingId, photos, photographerId]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      const next = (prev + 1) % photos.length;
      const assetId = photos[next]?.id;
      if (assetId) viewedPhotos.current.add(assetId);
      return next;
    });
  }, [photos]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      const next = (prev - 1 + photos.length) % photos.length;
      const assetId = photos[next]?.id;
      if (assetId) viewedPhotos.current.add(assetId);
      return next;
    });
  }, [photos]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  const heroPhoto = photos[0];
  const gridPhotos = photos.slice(1);

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Gallery
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        {photos.length} Photos
      </Typography>

      {heroPhoto && (
        <Box
          onClick={() => openLightbox(0)}
          sx={{
            mb: 2,
            borderRadius: 1,
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative',
            '&:hover img': { transform: 'scale(1.02)' },
            '&:hover .gallery-overlay': { opacity: 1 },
          }}
        >
          <GalleryImage
            src={getFullSrc(heroPhoto)}
            alt={heroPhoto.alt_text || heroPhoto.caption || 'Featured photo'}
            eager
            height={{ xs: 300, sm: 400, md: 500 }}
          />
          <Box
            className="gallery-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.2)',
              opacity: 0,
              transition: 'opacity 0.4s ease',
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {gridPhotos.map((photo, index) => {
          const actualIndex = index + 1;
          return (
            <Box
              key={photo.id}
              onClick={() => openLightbox(actualIndex)}
              sx={{
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                aspectRatio: '4/3',
                bgcolor: 'background.paper',
                '&:hover img': { transform: 'scale(1.02)' },
                '&:hover .gallery-overlay': { opacity: 1 },
              }}
            >
              <GalleryImage
                src={getGridSrc(photo)}
                alt={photo.alt_text || photo.caption || `Photo ${actualIndex + 1}`}
                eager={actualIndex < 4}
                fill
              />
              <Box
                className="gallery-overlay"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.25)',
                  opacity: 0,
                  transition: 'opacity 0.4s ease',
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 1.5,
                }}
              >
                {photo.caption && (
                  <Typography variant="caption" sx={{ color: 'common.white', fontWeight: 400 }}>
                    {photo.caption}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Box
            component={motion.div}
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeLightbox}
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(5, 5, 5, 0.97)',
              backdropFilter: 'blur(30px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 'modal',
            }}
          >
            <IconButton
              onClick={closeLightbox}
              sx={{
                position: 'absolute',
                top: { xs: 12, md: 24 },
                right: { xs: 12, md: 24 },
                color: 'grey.400',
                '&:hover': { color: 'common.white' },
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: { xs: 20, md: 32 },
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'grey.500',
                letterSpacing: '0.1em',
                fontWeight: 400,
              }}
            >
              {`${lightboxIndex + 1} / ${photos.length}`}
            </Typography>

            <IconButton
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              sx={{
                position: 'absolute',
                left: { xs: 8, md: 32 },
                color: 'grey.400',
                '&:hover': { color: 'common.white', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ArrowBackIosNewIcon />
            </IconButton>

            <IconButton
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              sx={{
                position: 'absolute',
                right: { xs: 8, md: 32 },
                color: 'grey.400',
                '&:hover': { color: 'common.white', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>

            <Stack
              component={motion.div}
              key={lightboxIndex}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              alignItems="center"
              spacing={2}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ maxWidth: '90vw', maxHeight: '85vh' }}
            >
              <Box
                component="img"
                src={getFullSrc(photos[lightboxIndex])}
                alt={photos[lightboxIndex]?.alt_text || ''}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                sx={{
                  maxWidth: '90vw',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 0.5,
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                }}
              />
              {photos[lightboxIndex]?.caption && (
                <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center', fontWeight: 400 }}>
                  {photos[lightboxIndex].caption}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </AnimatePresence>
    </SectionReveal>
  );
});

function GalleryImage({
  src,
  alt,
  eager = false,
  fill = false,
  height,
}: {
  src: string;
  alt: string;
  eager?: boolean;
  fill?: boolean;
  height?: Record<string, number>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <Box
      component="img"
      ref={imgRef}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onLoad={handleLoad}
      sx={{
        width: '100%',
        height: fill ? '100%' : (height || 'auto'),
        objectFit: 'cover',
        display: 'block',
        opacity: 0,
        userSelect: 'none',
        WebkitUserDrag: 'none',
        transition: 'opacity 0.4s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
}
