import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { SLUG_PX, BLEED_PX } from '../brochureTypes';

interface PrintSheetProps {
  innerW: number; // artwork width incl. bleed
  innerH: number; // artwork height incl. bleed
  foldX?: number; // fold x-position within the artwork (booklet only)
  children: ReactNode;
}

const TRIM = SLUG_PX + BLEED_PX; // 25px in from the outer sheet edge
const MARK_GAP = 3; // keep marks off the artwork
const MARK_LEN = SLUG_PX - MARK_GAP; // 9.5px, lives entirely in the slug zone

const markSx = { position: 'absolute' as const, backgroundColor: '#000' };

export default function PrintSheet({ innerW, innerH, foldX, children }: PrintSheetProps) {
  const w = innerW + SLUG_PX * 2;
  const h = innerH + SLUG_PX * 2;
  const tx0 = TRIM;
  const tx1 = w - TRIM;
  const ty0 = TRIM;
  const ty1 = h - TRIM;

  const vMark = (left: number, top: number) => ({ ...markSx, left, top, width: '1px', height: MARK_LEN });
  const hMark = (left: number, top: number) => ({ ...markSx, left, top, width: MARK_LEN, height: '1px' });

  const foldPos = foldX != null ? SLUG_PX + foldX : null;

  return (
    <Box sx={{ position: 'relative', width: w, height: h, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: SLUG_PX, left: SLUG_PX, width: innerW, height: innerH, overflow: 'hidden' }}>
        {children}
      </Box>

      {/* 8 corner crop marks at the trim lines, inside the slug zone */}
      <Box sx={vMark(tx0, 0)} />
      <Box sx={hMark(0, ty0)} />
      <Box sx={vMark(tx1, 0)} />
      <Box sx={hMark(w - MARK_LEN, ty0)} />
      <Box sx={vMark(tx0, h - MARK_LEN)} />
      <Box sx={hMark(0, ty1)} />
      <Box sx={vMark(tx1, h - MARK_LEN)} />
      <Box sx={hMark(w - MARK_LEN, ty1)} />

      {/* Fold marks (booklet) — dashed, top and bottom slug zones only */}
      {foldPos != null && (
        <>
          <Box sx={{ position: 'absolute', left: foldPos, top: 0, height: MARK_LEN, borderLeft: '1px dashed #000' }} />
          <Box sx={{ position: 'absolute', left: foldPos, top: h - MARK_LEN, height: MARK_LEN, borderLeft: '1px dashed #000' }} />
        </>
      )}
    </Box>
  );
}
