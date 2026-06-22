import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';

interface FitScaleProps {
  height: number;
  children: ReactNode;
  align?: 'flex-start' | 'center' | 'flex-end';
  maxScale?: number;
}

export default function FitScale({ height, children, align = 'center', maxScale = 1 }: FitScaleProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: maxScale, offsetY: 0 });

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      const natural = el.scrollHeight;
      if (natural <= 0) return;
      const scale = Math.min(maxScale, height / natural) || maxScale;
      const scaledH = natural * scale;
      const offsetY =
        align === 'center' ? (height - scaledH) / 2 : align === 'flex-end' ? height - scaledH : 0;
      setFit({ scale, offsetY });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height, maxScale, align, children]);

  return (
    <Box sx={{ position: 'relative', height, width: '100%', overflow: 'hidden' }}>
      <Box
        ref={innerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transformOrigin: 'top center',
          transform: `translateY(${fit.offsetY}px) scale(${fit.scale})`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
