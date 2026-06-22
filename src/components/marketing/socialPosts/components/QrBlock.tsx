import Box from '@mui/material/Box';
import QrTile from './QrTile';
import { LUXE_FONTS } from '../theme';

interface QrBlockProps {
  slug: string;
  size?: number;
  modules?: string;
  tile?: string;
  frame?: string;
  caption?: string;
  captionColor?: string;
  layout?: 'stack' | 'inline';
  label?: string;
}

export default function QrBlock({
  slug,
  size = 118,
  modules = '#0F1825',
  tile = '#FFFFFF',
  frame,
  caption,
  captionColor,
  layout = 'stack',
  label = 'SCAN TO VIEW',
}: QrBlockProps) {
  const text = caption ?? label;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: layout === 'stack' ? 'column' : 'row',
        alignItems: 'center',
        gap: layout === 'stack' ? '10px' : '14px',
        flex: 'none',
      }}
    >
      <Box
        sx={{
          padding: '8px',
          backgroundColor: tile,
          border: frame ? `1px solid ${frame}` : 'none',
          flex: 'none',
        }}
      >
        <QrTile slug={slug} size={size} dark={modules} light={tile} />
      </Box>
      {text && (
        <Box
          sx={{
            fontFamily: LUXE_FONTS.label,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: captionColor ?? modules,
            whiteSpace: layout === 'inline' ? 'nowrap' : 'normal',
            textAlign: 'center',
            maxWidth: layout === 'inline' ? 90 : size + 16,
            lineHeight: 1.3,
          }}
        >
          {text}
        </Box>
      )}
    </Box>
  );
}
