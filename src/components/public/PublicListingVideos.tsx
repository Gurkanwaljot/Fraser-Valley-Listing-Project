import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { keyframes } from '@mui/material/styles';
import { trackListingEvent } from '../../services/publicListingService';
import SectionReveal from './SectionReveal';
import type { MediaAsset } from '../../types/database';

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
`;

interface Props {
  videos: MediaAsset[];
  listingId: string;
}

export default function PublicListingVideos({ videos, listingId }: Props) {
  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Video Tour
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        {videos.length === 1 ? 'Property Video' : `${videos.length} Videos`}
      </Typography>

      <Grid container spacing={3}>
        {videos.map((video) => (
          <Grid key={video.id} size={{ xs: 12, md: videos.length === 1 ? 12 : 6 }}>
            <VideoPlayer video={video} listingId={listingId} />
          </Grid>
        ))}
      </Grid>
    </SectionReveal>
  );
}

function VideoPlayer({ video, listingId }: { video: MediaAsset; listingId: string }) {
  const [playing, setPlaying] = useState(false);
  const [posterFaded, setPosterFaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterUrl = video.poster_url || video.thumbnail_url || undefined;

  const handlePlay = useCallback(() => {
    setPlaying(true);
    trackListingEvent(listingId, 'video_play', { asset_id: video.id });
    setTimeout(() => videoRef.current?.play(), 50);
    setTimeout(() => setPosterFaded(true), 600);
  }, [listingId, video.id]);

  return (
    <Box
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        position: 'relative',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'common.black',
        aspectRatio: '16/9',
      }}
    >
      {playing && (
        <Box
          component="video"
          ref={videoRef}
          src={video.public_url || ''}
          poster={posterUrl}
          controls
          controlsList="nodownload"
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            bgcolor: 'common.black',
            userSelect: 'none',
            '&::-webkit-media-controls-enclosure': {
              overflow: 'hidden',
            },
          }}
        />
      )}

      {!posterFaded && (
        <>
          {posterUrl && (
            <Box
              component="img"
              src={posterUrl}
              alt={video.caption || 'Video poster'}
              draggable={false}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                opacity: playing ? 0 : 1,
                transition: 'opacity 0.5s ease',
                pointerEvents: playing ? 'none' : 'auto',
              }}
            />
          )}
          {!playing && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.35)' },
                '&:hover .play-btn': { transform: 'scale(1.08)' },
              }}
              onClick={handlePlay}
            >
              <IconButton
                className="play-btn"
                disableRipple
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'common.white',
                  width: { xs: 64, md: 80 },
                  height: { xs: 64, md: 80 },
                  animation: `${pulse} 3s ease-in-out infinite`,
                  transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                <PlayArrowIcon sx={{ fontSize: { xs: 32, md: 40 }, ml: 0.5 }} />
              </IconButton>
            </Box>
          )}
          {!playing && video.caption && (
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                color: 'common.white',
                bgcolor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                px: 1.5,
                py: 0.5,
                borderRadius: 0.5,
                fontWeight: 400,
                letterSpacing: '0.02em',
              }}
            >
              {video.caption}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
