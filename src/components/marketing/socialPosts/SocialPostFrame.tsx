import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import Box from '@mui/material/Box';

export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1350;

interface PreviewProps {
  children: ReactNode;
  scale: number;
  background?: string;
  style?: CSSProperties;
}

export function SocialPostPreview({ children, scale, background, style }: PreviewProps) {
  return (
    <Box
      sx={{
        width: FRAME_WIDTH * scale,
        height: FRAME_HEIGHT * scale,
        position: 'relative',
        overflow: 'hidden',
        flex: 'none',
      }}
      style={style}
    >
      <Box
        sx={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          position: 'relative',
          overflow: 'hidden',
          background: background || 'transparent',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFeatureSettings: '"ss01", "cv11"',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface ExportNodeProps {
  children: ReactNode;
  background?: string;
  id?: string;
}

export const SocialPostExportNode = forwardRef<HTMLDivElement, ExportNodeProps>(
  function SocialPostExportNode({ children, background, id }, ref) {
    return (
      <Box
        ref={ref}
        id={id}
        aria-hidden
        sx={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          position: 'fixed',
          left: '-99999px',
          top: 0,
          overflow: 'hidden',
          background: background || 'transparent',
          fontFeatureSettings: '"ss01", "cv11"',
          pointerEvents: 'none',
        }}
      >
        {children}
      </Box>
    );
  },
);
