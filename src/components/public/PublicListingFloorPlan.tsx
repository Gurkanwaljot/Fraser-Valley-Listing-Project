import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SectionReveal from './SectionReveal';
import type { MediaAsset } from '../../types/database';

interface Props {
  floorPlans: MediaAsset[];
}

export default function PublicListingFloorPlan({ floorPlans }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Floor Plans
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        {floorPlans.length} Floor Plan{floorPlans.length > 1 ? 's' : ''}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: floorPlans.length === 1
            ? '1fr'
            : { xs: '1fr', sm: 'repeat(2, 1fr)', md: floorPlans.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' },
          gap: 2,
          maxWidth: floorPlans.length === 1 ? 700 : undefined,
        }}
      >
        {floorPlans.map((fp, idx) => (
          <Box
            key={fp.id}
            onClick={() => openLightbox(idx)}
            sx={{
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              transition: (theme) => theme.transitions.create('background-color', {
                duration: theme.transitions.duration.short,
              }),
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.04)' },
            }}
          >
            <Box
              component="img"
              src={fp.large_url || fp.public_url || fp.original_url || ''}
              alt={fp.alt_text || fp.caption || 'Floor plan'}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              sx={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: floorPlans.length === 1 ? 550 : 400,
                objectFit: 'contain',
                p: 2,
                userSelect: 'none',
                WebkitUserDrag: 'none',
              }}
            />
            {fp.caption && (
              <Typography
                variant="caption"
                sx={{ display: 'block', textAlign: 'center', pb: 1.5, color: 'text.secondary', fontWeight: 400 }}
              >
                {fp.caption}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      <Modal open={lightboxIndex !== null} onClose={closeLightbox}>
        <Fade in={lightboxIndex !== null}>
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(5, 5, 5, 0.97)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
            }}
            onClick={closeLightbox}
          >
            <IconButton
              onClick={closeLightbox}
              sx={{ position: 'absolute', top: 16, right: 16, color: 'grey.400', '&:hover': { color: 'common.white' } }}
            >
              <CloseIcon />
            </IconButton>
            {lightboxIndex !== null && (
              <Box
                component="img"
                src={floorPlans[lightboxIndex].large_url || floorPlans[lightboxIndex].public_url || floorPlans[lightboxIndex].original_url || ''}
                alt={floorPlans[lightboxIndex].alt_text || 'Floor plan'}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                }}
              />
            )}
          </Box>
        </Fade>
      </Modal>
    </SectionReveal>
  );
}
