import Box from '@mui/material/Box';
import type { CSSProperties } from 'react';
import { LUXE_FONTS } from '../theme';
import AutoFitText from './AutoFitText';

interface PriceTagProps {
  price: string;
  label?: string;
  valueColor: string;
  labelColor: string;
  valueSize?: number;
  align?: CSSProperties['textAlign'];
  maxWidth?: number | string;
}

export default function PriceTag({
  price,
  label = 'Offered At',
  valueColor,
  labelColor,
  valueSize = 60,
  align = 'left',
  maxWidth,
}: PriceTagProps) {
  if (!price) return null;
  return (
    <Box sx={{ textAlign: align, flex: 'none', minWidth: 0, maxWidth }}>
      <Box
        sx={{
          fontFamily: LUXE_FONTS.label,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: labelColor,
          mb: '6px',
        }}
      >
        {label}
      </Box>
      <AutoFitText
        maxFontSize={valueSize}
        minFontSize={Math.round(valueSize * 0.55)}
        maxLines={1}
        fontFamily={LUXE_FONTS.display}
        fontWeight={500}
        color={valueColor}
        lineHeight={0.95}
        letterSpacing="-0.01em"
        align={align}
      >
        {price}
      </AutoFitText>
    </Box>
  );
}
