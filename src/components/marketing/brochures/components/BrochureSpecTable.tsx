import Box from '@mui/material/Box';
import type { LuxeTheme } from '../../socialPosts/theme';
import { brochureStyle, type SpecRow } from '../brochureTypes';

interface BrochureSpecTableProps {
  rows: SpecRow[];
  theme: LuxeTheme;
  onDark?: boolean;
  labelSize?: number;
  valueSize?: number;
  rowGap?: number;
}

export default function BrochureSpecTable({
  rows,
  theme,
  onDark = false,
  labelSize = 15,
  valueSize = 26,
  rowGap = 18,
}: BrochureSpecTableProps) {
  const style = brochureStyle(theme);
  if (rows.length === 0) return null;

  const ink = onDark ? style.fieldInk : theme.ink;
  const sub = onDark ? style.fieldSub : theme.sub;
  const hairline = onDark ? 'rgba(244,239,229,0.18)' : theme.hairline;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {rows.map((row, i) => (
        <Box
          key={row.label}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '16px',
            paddingTop: `${rowGap}px`,
            paddingBottom: `${rowGap}px`,
            borderTop: i === 0 ? 'none' : `1px solid ${hairline}`,
          }}
        >
          <Box
            sx={{
              fontFamily: style.labelFont,
              fontSize: labelSize,
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: sub,
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            {row.label}
          </Box>
          <Box sx={{ flex: 1, minWidth: '12px', borderBottom: `1px dotted ${style.gold}`, opacity: 0.5, transform: 'translateY(-6px)' }} />
          <Box
            sx={{
              fontFamily: style.valueFont,
              fontWeight: style.valueWeight,
              fontSize: valueSize,
              color: ink,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            {row.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
