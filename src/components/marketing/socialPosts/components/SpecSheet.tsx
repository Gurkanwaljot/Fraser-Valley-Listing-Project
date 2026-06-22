import Box from '@mui/material/Box';
import { LUXE_FONTS, type LuxeTheme } from '../theme';

export interface SpecItem {
  label: string;
  value: string;
}

interface SpecSheetProps {
  stats: SpecItem[];
  theme: LuxeTheme;
  valueSize?: number;
  columns?: number;
  max?: number;
}

export default function SpecSheet({ stats, theme, valueSize = 40, columns = 2, max = 4 }: SpecSheetProps) {
  const items = stats.slice(0, max);
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: '48px',
        rowGap: '18px',
        width: '100%',
      }}
    >
      {items.map((s, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: '14px', minWidth: 0 }}>
          <Box
            sx={{
              fontFamily: LUXE_FONTS.label,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: theme.sub,
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            {s.label}
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: '12px',
              borderBottom: `1px dotted ${theme.accentSoft}`,
              transform: 'translateY(-6px)',
            }}
          />
          <Box
            sx={{
              fontFamily: LUXE_FONTS.display,
              fontSize: valueSize,
              fontWeight: 500,
              color: theme.ink,
              lineHeight: 1,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            {s.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
