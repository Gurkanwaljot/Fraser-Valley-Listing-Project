import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Box from '@mui/material/Box';

interface AutoFitTextProps {
  children: string;
  maxFontSize: number;
  minFontSize?: number;
  maxLines?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  color?: string;
  lineHeight?: number;
  letterSpacing?: string;
  textTransform?: CSSProperties['textTransform'];
  fontStyle?: CSSProperties['fontStyle'];
  align?: CSSProperties['textAlign'];
}

export default function AutoFitText({
  children,
  maxFontSize,
  minFontSize = 18,
  maxLines = 2,
  fontFamily,
  fontWeight,
  color,
  lineHeight = 1.05,
  letterSpacing,
  textTransform,
  fontStyle,
  align,
}: AutoFitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = maxFontSize;
      el.style.fontSize = `${size}px`;
      while (size > minFontSize) {
        const fitsWidth = el.scrollWidth <= el.clientWidth + 1;
        const fitsHeight = el.scrollHeight <= size * lineHeight * maxLines + 2;
        if (fitsWidth && fitsHeight) break;
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };

    fit();
  }, [children, maxFontSize, minFontSize, maxLines, lineHeight]);

  return (
    <Box
      ref={ref}
      sx={{
        fontFamily,
        fontWeight,
        color,
        lineHeight,
        letterSpacing,
        textTransform,
        fontStyle,
        textAlign: align,
        fontSize,
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {children}
    </Box>
  );
}
