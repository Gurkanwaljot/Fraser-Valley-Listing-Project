import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SectionReveal from './SectionReveal';

interface Props {
  embedCode: string;
}

function extractSrc(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const match = trimmed.match(/src=["']([^"']+)["']/);
  return match ? match[1] : trimmed;
}

export default function PublicListingInteractiveFloorPlan({ embedCode }: Props) {
  const src = useMemo(() => extractSrc(embedCode), [embedCode]);

  if (!src) return null;

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Interactive Floor Plan
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        Tour
      </Typography>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          component="iframe"
          src={src}
          title="Interactive Floor Plan"
          allow="fullscreen; accelerometer; gyroscope"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </Box>
    </SectionReveal>
  );
}
