import Box from '@mui/material/Box';

interface ScrimPanelProps {
  scrim?: string;
  from?: number;
  strength?: number;
  direction?: number;
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function ScrimPanel({
  scrim = '#0B0F16',
  from = 35,
  strength = 0.85,
  direction = 180,
}: ScrimPanelProps) {
  const [r, g, b] = toRgb(scrim);
  const gradient = `linear-gradient(${direction}deg, rgba(${r},${g},${b},0) ${from}%, rgba(${r},${g},${b},${strength}) 100%)`;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: gradient,
        pointerEvents: 'none',
      }}
    />
  );
}
