import Box from '@mui/material/Box';
import type { Realtor } from '../../../../types/database';
import { LUXE_FONTS, type LuxeTheme } from '../theme';
import QrBlock from './QrBlock';

interface AgentSignatureProps {
  realtor: Realtor;
  slug: string;
  theme: LuxeTheme;
  showInstagram?: boolean;
  showEmail?: boolean;
}

function prettyHandle(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = u.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (u.hostname.includes('instagram')) return `@${path}`;
    return `${u.hostname}${path ? `/${path}` : ''}`;
  } catch {
    return url;
  }
}

export default function AgentSignature({
  realtor,
  slug,
  theme,
  showInstagram = true,
  showEmail = false,
}: AgentSignatureProps) {
  const headshot = realtor.headshot_url;
  const logo = realtor.brokerage_logo_url;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '32px', width: '100%', fontFamily: LUXE_FONTS.body }}>
      {headshot && (
        <Box
          sx={{
            width: 138,
            height: 138,
            borderRadius: '50%',
            overflow: 'hidden',
            flex: 'none',
            border: `1.5px solid ${theme.accent}`,
            padding: '4px',
            backgroundColor: 'transparent',
          }}
        >
          <Box
            component="img"
            src={headshot}
            alt=""
            sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', borderRadius: '50%' }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Box
          sx={{
            fontFamily: LUXE_FONTS.display,
            fontSize: 40,
            fontWeight: 500,
            lineHeight: 1.05,
            color: theme.ink,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {realtor.full_name}
        </Box>

        {(realtor.brokerage || logo) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {logo && (
              <Box
                component="img"
                src={logo}
                alt=""
                sx={{ height: 44, width: 'auto', maxWidth: 150, display: 'block', objectFit: 'contain' }}
              />
            )}
            {realtor.brokerage && (
              <Box
                sx={{
                  fontFamily: LUXE_FONTS.label,
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: theme.accent,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {realtor.brokerage}
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', mt: '4px', flexWrap: 'wrap' }}>
          {realtor.phone && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 20, fontWeight: 500, color: theme.ink }}>
              {realtor.phone}
            </Box>
          )}
          {showEmail && realtor.email && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 17, fontWeight: 400, color: theme.sub }}>
              {realtor.email}
            </Box>
          )}
          {showInstagram && realtor.instagram_url && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 17, fontWeight: 400, color: theme.sub }}>
              {prettyHandle(realtor.instagram_url)}
            </Box>
          )}
        </Box>
      </Box>

      <QrBlock
        slug={slug}
        size={120}
        modules={theme.qrDark}
        tile={theme.qrLight}
        caption="SCAN TO TOUR"
        captionColor={theme.accent}
        layout="stack"
      />
    </Box>
  );
}
