import Box from '@mui/material/Box';
import { LUXE_FONTS, type LuxeTheme } from '../../socialPosts/theme';
import { brochureStyle } from '../brochureTypes';

interface MonogramProps {
  name: string;
  size?: number;
  theme: LuxeTheme;
  onDark?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Monogram({ name, size = 96, theme, onDark = false }: MonogramProps) {
  const style = brochureStyle(theme);
  const ink = onDark ? style.fieldInk : theme.ink;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${style.gold}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <Box
        sx={{
          fontFamily: LUXE_FONTS.display,
          fontWeight: 500,
          fontSize: size * 0.4,
          letterSpacing: '0.04em',
          color: ink,
          lineHeight: 1,
        }}
      >
        {initials(name)}
      </Box>
    </Box>
  );
}
