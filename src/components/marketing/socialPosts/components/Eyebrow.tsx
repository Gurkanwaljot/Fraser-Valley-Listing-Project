import Box from '@mui/material/Box';
import type { CSSProperties } from 'react';
import { LUXE_FONTS } from '../theme';

interface EyebrowProps {
  children: string;
  color: string;
  fontSize?: number;
  align?: CSSProperties['textAlign'];
}

export default function Eyebrow({ children, color, fontSize = 15, align = 'left' }: EyebrowProps) {
  return (
    <Box
      sx={{
        fontFamily: LUXE_FONTS.label,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.46em',
        textTransform: 'uppercase',
        color,
        textAlign: align,
        lineHeight: 1,
      }}
    >
      {children}
    </Box>
  );
}
