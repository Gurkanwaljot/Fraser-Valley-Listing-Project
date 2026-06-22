import { useMemo } from 'react';
import Box from '@mui/material/Box';
import type { TemplateDefinition, PostTemplateProps } from '../templateTypes';

interface TemplatePreviewProps {
  template: TemplateDefinition;
  templateProps: PostTemplateProps;
  width: number;
}

const FRAME_W = 1080;
const FRAME_H = 1350;

export default function TemplatePreview({ template, templateProps, width }: TemplatePreviewProps) {
  const scale = useMemo(() => width / FRAME_W, [width]);
  const Component = template.Component;

  return (
    <Box
      sx={{
        width,
        height: FRAME_H * scale,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0B0B0B',
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          width: FRAME_W,
          height: FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <Component {...templateProps} />
      </Box>
    </Box>
  );
}
