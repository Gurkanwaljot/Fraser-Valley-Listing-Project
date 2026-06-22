import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { generateQrDataUrl, buildListingShareUrl } from './qrCode';

interface QrTileProps {
  slug: string;
  size: number;
  dark?: string;
  light?: string;
  borderColor?: string;
  borderWidth?: number;
  rounded?: number;
}

export default function QrTile({
  slug,
  size,
  dark = '#0F1825',
  light = '#FFFFFF',
  borderColor,
  borderWidth = 0,
  rounded = 0,
}: QrTileProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(buildListingShareUrl(slug), { size: size * 2, dark, light })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        // ignore — empty tile
      });
    return () => {
      cancelled = true;
    };
  }, [slug, size, dark, light]);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        backgroundColor: light,
        borderRadius: `${rounded}px`,
        border: borderColor ? `${borderWidth}px solid ${borderColor}` : 'none',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {src && (
        <Box
          component="img"
          src={src}
          alt=""
          sx={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}
    </Box>
  );
}
