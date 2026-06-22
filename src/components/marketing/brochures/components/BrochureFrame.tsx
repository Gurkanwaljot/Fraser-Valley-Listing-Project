import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import Box from '@mui/material/Box';

interface PreviewProps {
  width: number;
  height: number;
  scale: number;
  children: ReactNode;
  style?: CSSProperties;
}

export function BrochurePreview({ width, height, scale, children, style }: PreviewProps) {
  return (
    <Box
      sx={{ width: width * scale, height: height * scale, position: 'relative', overflow: 'hidden', flex: 'none' }}
      style={style}
    >
      <Box
        sx={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFeatureSettings: '"ss01"',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface ExportNodeProps {
  width: number;
  height: number;
  children: ReactNode;
}

export const BrochureExportNode = forwardRef<HTMLDivElement, ExportNodeProps>(
  function BrochureExportNode({ width, height, children }, ref) {
    return (
      <Box
        ref={ref}
        aria-hidden
        sx={{
          width,
          height,
          position: 'fixed',
          left: '-99999px',
          top: 0,
          overflow: 'hidden',
          fontFeatureSettings: '"ss01"',
          pointerEvents: 'none',
        }}
      >
        {children}
      </Box>
    );
  },
);
