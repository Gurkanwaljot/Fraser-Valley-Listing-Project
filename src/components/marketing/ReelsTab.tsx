import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import DownloadIcon from '@mui/icons-material/Download';
import VideocamIcon from '@mui/icons-material/Videocam';
import { motion } from 'framer-motion';

import ReelPhotoPicker from './reel/ReelPhotoPicker';
import TempoPicker from './reel/TempoPicker';
import ReelPreviewPlayer from './reel/ReelPreviewPlayer';
import { LUXE_THEMES } from './socialPosts/theme';
import { STATUS_OPTIONS, type PostStatus } from './socialPosts/templateTypes';
import { buildListingShareUrl } from './socialPosts/components/qrCode';
import { formatStreetAddress, getListingStats } from '../../services/marketingService';
import { loadImage, generateQRCodeImage, downloadBlob } from '../../utils/canvasRenderer';
import { loadReelFonts } from '../../utils/reel/reelDraw';
import {
  buildScene,
  computeReelDuration,
  maxPhotosForTempo,
  TEMPO_PRESETS,
  type Tempo,
  type BuildSceneInput,
} from '../../utils/reel/reelScene';
import { encodeReel, NoWebCodecsError } from '../../utils/reel/reelEncode';
import type { MarketingListingData } from '../../services/marketingService';
import { trackMarketingEvent } from '../../services/marketingAnalyticsService';

const MotionBox = motion.create(Box);

interface ReelsTabProps {
  data: MarketingListingData;
}

type ReelStatus = PostStatus | 'none';

const FETCH_TIMEOUT_MS = 15000;
const dataUrlCache = new Map<string, string>();

async function urlToDataUrl(url: string): Promise<string> {
  if (!url) throw new Error('Empty URL');
  if (url.startsWith('data:')) return url;
  const cached = dataUrlCache.get(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } finally {
    clearTimeout(timer);
  }
}

type PhotoAsset = { id: string; large_url?: string | null; original_url?: string | null; public_url?: string | null; thumbnail_url?: string | null };

function getUrlCandidates(asset: PhotoAsset): string[] {
  return [asset.large_url, asset.original_url, asset.public_url, asset.thumbnail_url].filter(Boolean) as string[];
}

async function loadPhotoAsSafe(asset: PhotoAsset): Promise<HTMLImageElement | null> {
  const candidates = getUrlCandidates(asset);
  for (const url of candidates) {
    try {
      const dataUrl = await urlToDataUrl(url);
      const img = await loadImage(dataUrl);
      return img;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function loadMiscImage(url: string | undefined | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try {
    const dataUrl = await urlToDataUrl(url);
    return await loadImage(dataUrl);
  } catch {
    return null;
  }
}

export default function ReelsTab({ data }: ReelsTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    data.photos.slice(0, Math.min(8, data.photos.length)).map(p => p.id)
  );
  const [tempo, setTempo] = useState<Tempo>('balanced');
  const [status, setStatus] = useState<ReelStatus>('just-listed');
  const [themeId, setThemeId] = useState('onyx');
  const [encoding, setEncoding] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [imageMap, setImageMap] = useState<Map<string, HTMLImageElement>>(new Map());
  const [headshot, setHeadshot] = useState<HTMLImageElement | null>(null);
  const [brokerageLogo, setBrokerageLogo] = useState<HTMLImageElement | null>(null);
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const imageMapRef = useRef<Map<string, HTMLImageElement>>(imageMap);
  imageMapRef.current = imageMap;

  const primaryRealtor = data.realtors[0];
  const theme = LUXE_THEMES.find(t => t.id === themeId) ?? LUXE_THEMES[1];
  const preset = TEMPO_PRESETS[tempo];
  const maxPhotos = maxPhotosForTempo(preset);
  const computedLength = computeReelDuration(selectedIds.length, preset);

  useEffect(() => {
    if (selectedIds.length > maxPhotos) {
      setSelectedIds(prev => prev.slice(0, maxPhotos));
    }
  }, [maxPhotos, selectedIds.length]);

  useEffect(() => {
    loadReelFonts().then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const map = new Map<string, HTMLImageElement>();
      await Promise.all(
        selectedIds.map(async (id) => {
          if (cancelled) return;
          const photo = data.photos.find(p => p.id === id);
          if (!photo) return;
          const img = await loadPhotoAsSafe(photo as PhotoAsset);
          if (img && !cancelled) map.set(id, img);
        }),
      );
      if (!cancelled) setImageMap(map);
    };
    loadAll();
    return () => { cancelled = true; };
  }, [selectedIds, data.photos]);

  useEffect(() => {
    loadMiscImage(primaryRealtor?.headshot_url).then(setHeadshot);
    loadMiscImage(primaryRealtor?.brokerage_logo_url).then(setBrokerageLogo);
    const qrUrl = buildListingShareUrl(data.listing.slug);
    generateQRCodeImage(qrUrl, 200).then(setQrImage).catch(() => setQrImage(null));
  }, [primaryRealtor, data.listing.slug]);

  const scene = useMemo(() => {
    if (selectedIds.length < 5) return null;
    const statusOption = status !== 'none' ? STATUS_OPTIONS.find(s => s.value === status) : null;
    const stats = getListingStats(data.listing);
    const specsStr = [
      data.listing.bedrooms ? `${data.listing.bedrooms} BD` : null,
      data.listing.bathrooms ? `${data.listing.bathrooms} BA` : null,
      data.listing.square_footage ? `${data.listing.square_footage.toLocaleString()} SQ. FT.` : null,
      data.listing.property_type ? data.listing.property_type.toUpperCase() : null,
    ].filter(Boolean).join(' \u00B7 ');

    const input: BuildSceneInput = {
      photoKeys: selectedIds,
      tempo,
      statusHeadline: statusOption?.headline ?? null,
      address: formatStreetAddress(data.listing),
      addressCity: [data.listing.city, data.listing.province_state].filter(Boolean).join(', '),
      specs: specsStr || stats.slice(0, 3).map(s => `${s.value} ${s.label.toUpperCase()}`).join(' \u00B7 '),
      theme,
      agentName: primaryRealtor?.full_name ?? '',
      agentBrokerage: primaryRealtor?.brokerage ?? '',
      outro: {
        name: primaryRealtor?.full_name ?? '',
        phone: primaryRealtor?.phone ?? undefined,
        email: undefined,
        headshotKey: primaryRealtor?.headshot_url ? 'headshot' : undefined,
        brokerageLogoKey: primaryRealtor?.brokerage_logo_url ? 'logo' : undefined,
        qrKey: 'qr',
        price: undefined,
        cta: 'Schedule your private showing',
      },
    };
    return buildScene(input);
  }, [selectedIds, tempo, status, theme, data, primaryRealtor]);

  const handleExport = useCallback(async () => {
    if (!scene) return;
    setEncoding(true);
    setEncodeProgress(0);
    setError(null);

    try {
      // Reuse already-loaded data-URL images — only load missing ones
      const fullMap = new Map<string, HTMLImageElement>(imageMapRef.current);
      const missing = selectedIds.filter(id => !fullMap.has(id));
      if (missing.length > 0) {
        await Promise.all(
          missing.map(async (id) => {
            const photo = data.photos.find(p => p.id === id);
            if (!photo) return;
            const img = await loadPhotoAsSafe(photo as PhotoAsset);
            if (img) fullMap.set(id, img);
          }),
        );
      }

      // Filter selectedIds to only those we actually loaded
      const validIds = selectedIds.filter(id => fullMap.has(id));
      if (validIds.length < 5) {
        setError(`Only ${validIds.length} photos loaded successfully (minimum 5 required). Try selecting different photos.`);
        setEncoding(false);
        return;
      }

      const blob = await encodeReel(
        scene,
        fullMap,
        { headshot, logo: brokerageLogo, qr: qrImage },
        setEncodeProgress,
      );

      const address = formatStreetAddress(data.listing).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      downloadBlob(blob, `${address}-reel.mp4`);
      trackMarketingEvent(data.listing.id, 'reel_export', {
        tempo,
        photo_count: selectedIds.length,
      });
    } catch (err) {
      if (err instanceof NoWebCodecsError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Export failed');
      }
    }
    setEncoding(false);
  }, [scene, selectedIds, data, headshot, brokerageLogo, qrImage]);

  if (!primaryRealtor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No realtor assigned to this listing.
        </Typography>
      </Box>
    );
  }

  if (data.photos.length < 5) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          At least 5 photos are required to generate a reel. This listing has {data.photos.length}.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
        Generate cinematic vertical reels for Instagram, TikTok, and Facebook Reels.
      </Typography>
      <Alert
        severity="info"
        sx={{ mb: 3, bgcolor: 'surface.light', color: 'text.secondary', '& .MuiAlert-icon': { color: 'info.main' } }}
      >
        Your reel is silent — add music directly in Instagram when you post (Instagram's music library is licensed for the platform).
      </Alert>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          <MotionBox
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Stack spacing={3}>
              <ReelPhotoPicker
                photos={data.photos}
                selected={selectedIds}
                onChange={setSelectedIds}
                maxPhotos={maxPhotos}
              />

              <TempoPicker
                value={tempo}
                onChange={setTempo}
                computedLength={computedLength}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="reel-status-label">Status</InputLabel>
                <Select
                  labelId="reel-status-label"
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value as ReelStatus)}
                >
                  <MenuItem value="none">None</MenuItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 1 }}>
                  Palette
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {LUXE_THEMES.map((t) => (
                    <Box
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      title={t.name}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: t.bg,
                        border: 2,
                        borderColor: themeId === t.id ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: 'primary.light' },
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', bgcolor: t.accent }} />
                    </Box>
                  ))}
                </Box>
              </Box>

              {encoding ? (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={encodeProgress * 100}
                    sx={{
                      mb: 1,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: 'surface.dark',
                      '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Encoding MP4... {Math.round(encodeProgress * 100)}%
                  </Typography>
                </Box>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={!scene || selectedIds.length < 5 || !fontsReady}
                  sx={{ py: 1.3 }}
                >
                  Export Reel (MP4)
                </Button>
              )}
            </Stack>
          </MotionBox>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MotionBox
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {scene && fontsReady && imageMap.size >= 5 ? (
              <ReelPreviewPlayer
                scene={scene}
                images={imageMap}
                headshot={headshot}
                logo={brokerageLogo}
                qr={qrImage}
              />
            ) : (
              <Box
                sx={{
                  width: 324,
                  height: 576,
                  borderRadius: 3,
                  border: 2,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'surface.dark',
                }}
              >
                <Stack alignItems="center" spacing={1}>
                  <VideocamIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', px: 2 }}>
                    {selectedIds.length < 5
                      ? `Select at least 5 photos (${selectedIds.length} selected)`
                      : 'Loading preview...'}
                  </Typography>
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip label="Instagram Reels" size="small" sx={{ bgcolor: 'surface.light', color: 'text.secondary' }} />
              <Chip label="TikTok" size="small" sx={{ bgcolor: 'surface.light', color: 'text.secondary' }} />
              <Chip label="1080x1920" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              <Chip label="30fps" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              <Chip label="Silent MP4" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            </Stack>
          </MotionBox>
        </Grid>
      </Grid>
    </Box>
  );
}
