import Box from '@mui/material/Box';
import type { CSSProperties } from 'react';

interface PhotoFrameProps {
  src: string;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  objectFit?: CSSProperties['objectFit'];
  objectPosition?: string;
  backgroundColor?: string;
  style?: CSSProperties;
}

export default function PhotoFrame({
  src,
  width = '100%',
  height = '100%',
  borderColor,
  borderWidth = 0,
  borderRadius = 0,
  objectFit = 'cover',
  objectPosition = 'center',
  backgroundColor = '#0B0B0B',
  style,
}: PhotoFrameProps) {
  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${borderRadius}px`,
        border: borderColor ? `${borderWidth}px solid ${borderColor}` : 'none',
        backgroundColor,
        flex: 'none',
      }}
      style={style}
    >
      {src && (
        <Box
          component="img"
          src={src}
          alt=""
          sx={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit,
            objectPosition,
          }}
        />
      )}
    </Box>
  );
}
