import Box from '@mui/material/Box';
import { LUXE_FONTS, type LuxeTheme } from '../theme';

interface FeatureListProps {
  features: string[];
  theme: LuxeTheme;
  max?: number;
  columns?: number;
}

export default function FeatureList({ features, theme, max = 4, columns = 2 }: FeatureListProps) {
  const items = features.slice(0, max);
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: '48px',
        rowGap: '12px',
        width: '100%',
      }}
    >
      {items.map((feat, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: '14px', minWidth: 0 }}>
          <Box sx={{ width: 18, height: '1px', backgroundColor: theme.accent, flex: 'none', transform: 'translateY(-6px)' }} />
          <Box
            sx={{
              fontFamily: LUXE_FONTS.label,
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: theme.ink,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {feat}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
