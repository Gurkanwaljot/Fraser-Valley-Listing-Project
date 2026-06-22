import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import SpeedIcon from '@mui/icons-material/Speed';
import SlowMotionVideoIcon from '@mui/icons-material/SlowMotionVideo';
import MovieIcon from '@mui/icons-material/Movie';
import type { Tempo } from '../../../utils/reel/reelScene';

interface TempoPickerProps {
  value: Tempo;
  onChange: (tempo: Tempo) => void;
  computedLength: number;
}

const TEMPO_INFO: { key: Tempo; label: string; description: string; icon: typeof SpeedIcon }[] = [
  { key: 'cinematic', label: 'Cinematic', description: 'Slow, breathe into each room', icon: MovieIcon },
  { key: 'balanced', label: 'Balanced', description: 'Mix of slow reveals & energy', icon: SlowMotionVideoIcon },
  { key: 'punchy', label: 'Punchy', description: 'Fast, energetic cuts', icon: SpeedIcon },
];

export default function TempoPicker({ value, onChange, computedLength }: TempoPickerProps) {
  const formatLength = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 1 }}>
        Tempo
      </Typography>
      <Stack direction="row" spacing={1}>
        {TEMPO_INFO.map(({ key, label, description, icon: Icon }) => (
          <ButtonBase
            key={key}
            onClick={() => onChange(key)}
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 2,
              border: 2,
              borderColor: value === key ? 'primary.main' : 'divider',
              bgcolor: value === key ? 'action.selected' : 'surface.main',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              transition: 'all 0.2s',
              '&:hover': { borderColor: value === key ? 'primary.main' : 'text.disabled' },
            }}
          >
            <Icon sx={{ fontSize: 24, color: value === key ? 'primary.main' : 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: value === key ? 'primary.main' : 'text.primary' }}>
              {label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', textAlign: 'center' }}>
              {description}
            </Typography>
          </ButtonBase>
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
        Reel length: {formatLength(computedLength)}
      </Typography>
    </Box>
  );
}
