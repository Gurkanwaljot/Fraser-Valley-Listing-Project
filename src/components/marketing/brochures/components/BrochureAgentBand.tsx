import Box from '@mui/material/Box';
import type { Realtor } from '../../../../types/database';
import { LUXE_FONTS, type LuxeTheme } from '../../socialPosts/theme';
import { brochureStyle } from '../brochureTypes';
import Monogram from './Monogram';

interface BrochureAgentBandProps {
  realtor: Realtor;
  theme: LuxeTheme;
  onDark?: boolean;
  avatarSize?: number;
  nameSize?: number;
  showEmail?: boolean;
  showInstagram?: boolean;
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

export default function BrochureAgentBand({
  realtor,
  theme,
  onDark = false,
  avatarSize = 110,
  nameSize = 34,
  showEmail = true,
  showInstagram = true,
}: BrochureAgentBandProps) {
  const style = brochureStyle(theme);
  const ink = onDark ? style.fieldInk : theme.ink;
  const sub = onDark ? style.fieldSub : theme.sub;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', fontFamily: LUXE_FONTS.body }}>
      {realtor.headshot_url ? (
        <Box
          sx={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            overflow: 'hidden',
            flex: 'none',
            border: `1.5px solid ${style.gold}`,
            padding: '4px',
          }}
        >
          <Box
            component="img"
            src={realtor.headshot_url}
            alt=""
            sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', borderRadius: '50%' }}
          />
        </Box>
      ) : (
        <Monogram name={realtor.full_name} size={avatarSize} theme={theme} onDark={onDark} />
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Box
          sx={{
            fontFamily: style.titleFont,
            fontWeight: style.titleWeight,
            fontSize: nameSize,
            lineHeight: 1.05,
            color: ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {realtor.full_name}
        </Box>

        {(realtor.brokerage || realtor.brokerage_logo_url) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {realtor.brokerage_logo_url && (
              <Box
                component="img"
                src={realtor.brokerage_logo_url}
                alt=""
                sx={{ height: 36, width: 'auto', maxWidth: 130, display: 'block', objectFit: 'contain' }}
              />
            )}
            {realtor.brokerage && (
              <Box
                sx={{
                  fontFamily: style.labelFont,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: style.gold,
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '18px', mt: '2px', flexWrap: 'wrap' }}>
          {realtor.phone && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 18, fontWeight: 500, color: ink }}>{realtor.phone}</Box>
          )}
          {showEmail && realtor.email && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 15, fontWeight: 400, color: sub }}>{realtor.email}</Box>
          )}
          {showInstagram && realtor.instagram_url && (
            <Box sx={{ fontFamily: LUXE_FONTS.body, fontSize: 15, fontWeight: 400, color: sub }}>
              {prettyHandle(realtor.instagram_url)}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
