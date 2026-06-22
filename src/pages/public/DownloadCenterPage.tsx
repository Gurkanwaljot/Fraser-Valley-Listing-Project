import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideocamIcon from '@mui/icons-material/Videocam';
import DescriptionIcon from '@mui/icons-material/Description';
import MapIcon from '@mui/icons-material/Map';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { supabase } from '../../lib/supabase';
import { requestDownloadUrl } from '../../lib/storage';
import { APP_NAME } from '../../lib/constants';
import {
  validateShareToken,
  markShareAccessed,
  logDownload,
} from '../../services/sharesService';
import { requestStreamManifest } from '../../services/streamDownloadService';
import { streamZipDownload, type StreamProgress } from '../../services/streamZipDownload';
import { buildDownloadFilename } from '../../utils/downloadFilename';
import type { ShareValidation } from '../../services/sharesService';
import { trackListingEvent } from '../../services/publicListingService';
import type { MediaAsset, MediaKind, DownloadCategory } from '../../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const RESEND_COOLDOWN = 60;
const MAX_RETRIES = 3;
const WATERMARK_TEXT = 'FraserValleyRealEstatePhotography';

type PageState = 'loading' | 'expired' | 'verify' | 'ready';

interface MediaGroup {
  kind: MediaKind;
  label: string;
  icon: React.ReactNode;
  assets: MediaAsset[];
  totalSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface SingleFileProgress {
  bytesDelivered: number;
  expectedBytes: number;
}

async function fetchBlobWithProgress(
  url: string,
  expectedSize: number,
  onProgress?: (progress: SingleFileProgress) => void,
  retries = MAX_RETRIES,
): Promise<Blob> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : expectedSize;

      if (!response.body) {
        const blob = await response.blob();
        onProgress?.({ bytesDelivered: blob.size, expectedBytes: totalBytes });
        return blob;
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytesReceived = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytesReceived += value.length;
        onProgress?.({ bytesDelivered: bytesReceived, expectedBytes: totalBytes });
      }

      const combined = new Uint8Array(bytesReceived);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return new Blob([combined]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError!;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DownloadCenterPage() {
  const [searchParams] = useSearchParams();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const token = searchParams.get('token') || searchParams.get('t');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [validation, setValidation] = useState<ShareValidation | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, SingleFileProgress>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [streamRunning, setStreamRunning] = useState<Record<string, boolean>>({});
  const [streamProgress, setStreamProgress] = useState<Record<string, StreamProgress>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmationSentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (resendCountdown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCountdown > 0]);

  const tryLoadAsPrivilegedUser = useCallback(async (session: { user: { id: string } }): Promise<boolean> => {
    if (!urlSlug) return false;
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    const roles = (userRoles ?? []).map((r: { role: string }) => r.role);
    const isPrivileged = roles.includes('admin') || roles.includes('photographer');
    if (!isPrivileged) return false;
    const { data: listingRow } = await supabase
      .from('listings')
      .select('id, title, slug, address_line_1, address_line_2, city, province_state')
      .eq('slug', urlSlug)
      .maybeSingle();
    const listing = listingRow as { id: string; title: string; slug: string; address_line_1: string; address_line_2: string | null; city: string; province_state: string } | null;
    if (!listing) return false;
    setValidation({
      valid: true,
      listing: listing as unknown as ShareValidation['listing'],
    } as ShareValidation);
    const { data: assets } = await supabase
      .from('media_assets')
      .select('*')
      .eq('listing_id', listing.id)
      .eq('is_public', true)
      .order('kind')
      .order('sort_order');
    setMedia((assets as MediaAsset[]) ?? []);
    setPageState('ready');
    return true;
  }, [urlSlug]);

  const validateAndLoad = useCallback(async () => {
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const loaded = await tryLoadAsPrivilegedUser(session);
        if (loaded) return;
      }
      setPageState('expired');
      return;
    }

    const result = await validateShareToken(token);
    setValidation(result);

    if (!result.valid) {
      setPageState('expired');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (result.realtor?.email) {
        setEmail(result.realtor.email);
      }
      setPageState('verify');
      return;
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    const roles = (userRoles ?? []).map((r: { role: string }) => r.role);
    const isPrivileged = roles.includes('admin') || roles.includes('photographer');

    if (!isPrivileged && result.realtor?.email && session.user.email?.toLowerCase() !== result.realtor.email.toLowerCase()) {
      await supabase.auth.signOut();
      setEmail(result.realtor.email);
      setPageState('verify');
      return;
    }

    if (result.share) {
      await markShareAccessed(result.share.id);
      fetch(`${SUPABASE_URL}/functions/v1/notify-photographer-access`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: result.listing?.id,
          realtorName: result.realtor?.full_name ?? 'Unknown',
          realtorEmail: result.realtor?.email ?? '',
          accessedAt: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    }

    if (result.listing) {
      const { data: assets } = await supabase
        .from('media_assets')
        .select('*')
        .eq('listing_id', result.listing.id)
        .eq('is_public', true)
        .order('kind')
        .order('sort_order');

      setMedia((assets as MediaAsset[]) ?? []);

      await supabase.from('listing_events').insert({
        listing_id: result.listing.id,
        event_type: 'download_center_open',
        realtor_id: result.realtor?.id || null,
        user_id: session.user.id,
        metadata: {},
      } as never);
    }

    setPageState('ready');
  }, [token, urlSlug, tryLoadAsPrivilegedUser]);

  useEffect(() => {
    validateAndLoad();

    // If no token, also listen for auth state changes to handle the race
    // where getSession() returns null before the session is restored.
    if (!token && urlSlug) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
            await tryLoadAsPrivilegedUser(session);
          }
        },
      );
      return () => subscription.unsubscribe();
    }
  }, [validateAndLoad, token, urlSlug, tryLoadAsPrivilegedUser]);

  const getAddress = () => {
    if (!validation?.listing) return 'listing';
    return validation.listing.address_line_2
      ? `${validation.listing.address_line_2} - ${validation.listing.address_line_1}`
      : validation.listing.address_line_1;
  };

  const sendOtpEmail = async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        realtorName: validation?.realtor?.full_name,
        shareToken: token,
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || 'Failed to send verification code');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      await sendOtpEmail();
      setOtpSent(true);
      setResendCountdown(RESEND_COOLDOWN);
      if (validation?.listing?.id) {
        trackListingEvent(validation.listing.id, 'otp_requested', { email });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    }
    setVerifying(false);
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      await sendOtpEmail();
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, code: otp }),
      });
      const result = await response.json();
      if (!result.valid) {
        setError(result.error || 'Invalid or expired code');
        if (validation?.listing?.id) {
          trackListingEvent(validation.listing.id, 'otp_failed', { reason: result.error || 'invalid_code' });
        }
        setVerifying(false);
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: 'magiclink',
      });
      if (verifyError) {
        setError(verifyError.message);
        setVerifying(false);
        return;
      }
      if (validation?.listing?.id) {
        trackListingEvent(validation.listing.id, 'otp_verified', { email });
      }
      setVerifying(false);
      await validateAndLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerifying(false);
    }
  };

  const handleDownloadSingle = async (asset: MediaAsset, index: number) => {
    setDownloading((prev) => ({ ...prev, [asset.id]: true }));
    setDownloadProgress((prev) => ({ ...prev, [asset.id]: { bytesDelivered: 0, expectedBytes: asset.file_size_bytes } }));
    try {
      const presignedUrl = await requestDownloadUrl(asset.original_key);
      const blob = await fetchBlobWithProgress(
        presignedUrl,
        asset.file_size_bytes,
        (progress) => setDownloadProgress((prev) => ({ ...prev, [asset.id]: progress })),
      );
      const filename = buildDownloadFilename(getAddress(), asset.kind, index, asset.filename_original);
      triggerBlobDownload(blob, filename);

      const { data: { session } } = await supabase.auth.getSession();
      await logDownload({
        listingId: validation!.listing!.id,
        realtorId: validation?.realtor?.id,
        userId: session?.user.id,
        mediaAssetId: asset.id,
        downloadType: 'single',
        fileCount: 1,
        totalSizeBytes: asset.file_size_bytes,
        status: 'success',
      });
      trackListingEvent(validation!.listing!.id, 'asset_download_complete', {
        asset_id: asset.id,
        file_count: 1,
        total_size_bytes: asset.file_size_bytes,
        download_type: 'single',
        realtor_id: validation?.realtor?.id,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to download file. Please try again.');
      const { data: { session } } = await supabase.auth.getSession();
      await logDownload({
        listingId: validation!.listing!.id,
        realtorId: validation?.realtor?.id,
        userId: session?.user.id,
        mediaAssetId: asset.id,
        downloadType: 'single',
        fileCount: 1,
        totalSizeBytes: asset.file_size_bytes,
        status: 'failed',
        failureReason: reason,
      });
    }
    setDownloading((prev) => ({ ...prev, [asset.id]: false }));
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[asset.id];
      return next;
    });
  };

  const handleStream = async (kind: DownloadCategory) => {
    if (!validation?.listing?.id) return;
    if (streamRunning[kind]) return;
    setStreamRunning((prev) => ({ ...prev, [kind]: true }));
    setStreamProgress((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
    try {
      const manifest = await requestStreamManifest(validation.listing.id, kind, token || undefined);
      setStreamProgress((prev) => ({
        ...prev,
        [kind]: {
          bytesDelivered: 0,
          filesDelivered: 0,
          expectedBytes: manifest.expectedBytes,
          expectedFileCount: manifest.expectedFileCount,
          currentFile: null,
        },
      }));
      const result = await streamZipDownload(manifest, {
        onProgress: (progress) => {
          setStreamProgress((prev) => ({ ...prev, [kind]: progress }));
        },
      });

      const tolerance = Math.max(1024, Math.floor(manifest.expectedBytes * 0.001));
      if (result.bytesDelivered + tolerance < manifest.expectedBytes) {
        setError(
          `Download may be incomplete: got ${formatBytes(result.bytesDelivered)} of ~${formatBytes(manifest.expectedBytes)}. Please try again.`,
        );
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        await logDownload({
          listingId: validation.listing.id,
          realtorId: validation?.realtor?.id,
          userId: session?.user.id,
          downloadType: 'bulk_zip',
          assetIds: kind === 'all'
            ? media.map((a) => a.id)
            : media.filter((a) => a.kind === (kind as MediaKind)).map((a) => a.id),
          fileCount: result.filesDelivered,
          totalSizeBytes: result.bytesDelivered,
          status: 'success',
        });
        trackListingEvent(validation.listing.id, 'asset_download_complete', {
          file_count: result.filesDelivered,
          total_size_bytes: result.bytesDelivered,
          download_type: 'bulk_zip',
          category: kind,
          realtor_id: validation?.realtor?.id,
        });

        if (validation.realtor?.email && !confirmationSentRef.current.has(kind)) {
          confirmationSentRef.current.add(kind);
          const categoryLabels: Record<string, string> = { all: 'All Media', photo: 'Photos', video: 'Videos', floor_plan: 'Floor Plans', document: 'Documents' };
          fetch(`${SUPABASE_URL}/functions/v1/send-download-confirmation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              realtorName: validation.realtor.full_name,
              realtorEmail: validation.realtor.email,
              listingTitle: validation.listing.title,
              listingAddress: `${getAddress()}, ${validation.listing.city}, ${validation.listing.province_state}`,
              downloadCategory: categoryLabels[kind] ?? kind,
              fileCount: result.filesDelivered,
              totalSizeFormatted: formatBytes(result.bytesDelivered),
              redownloadUrl: `${window.location.origin}/?dl=${validation.listing.slug}&t=${token}`,
              expiresAt: validation.share?.expires_at ?? new Date(Date.now() + 5 * 86400000).toISOString(),
            }),
            keepalive: true,
          }).catch(() => {});
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
    }
    setStreamRunning((prev) => ({ ...prev, [kind]: false }));
  };

  const handleCategoryDownload = async (group: MediaGroup) => {
    if (group.assets.length === 1) {
      setStreamRunning((prev) => ({ ...prev, [group.kind]: true }));
      try {
        await handleDownloadSingle(group.assets[0], 0);
      } finally {
        setStreamRunning((prev) => ({ ...prev, [group.kind]: false }));
      }
      return;
    }
    const KIND_TO_CATEGORY: Record<MediaKind, DownloadCategory> = {
      photo: 'photo',
      video: 'video',
      floor_plan: 'floor_plan',
      document: 'document',
    };
    handleStream(KIND_TO_CATEGORY[group.kind]);
  };

  const mediaGroups: MediaGroup[] = (['photo', 'video', 'floor_plan', 'document'] as MediaKind[])
    .map((kind) => {
      const assets = media.filter((m) => m.kind === kind);
      const icons: Record<MediaKind, React.ReactNode> = {
        photo: <PhotoLibraryIcon />,
        video: <VideocamIcon />,
        floor_plan: <MapIcon />,
        document: <DescriptionIcon />,
      };
      const labels: Record<MediaKind, string> = {
        photo: 'Photos',
        video: 'Videos',
        floor_plan: 'Floor Plans',
        document: 'Documents',
      };
      return {
        kind,
        label: labels[kind],
        icon: icons[kind],
        assets,
        totalSize: assets.reduce((sum, a) => sum + a.file_size_bytes, 0),
      };
    })
    .filter((g) => g.assets.length > 0);

  // Loading state
  if (pageState === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  // Expired state
  if (pageState === 'expired') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Paper sx={{ maxWidth: 480, width: '100%', p: { xs: 2.5, sm: 5 }, textAlign: 'center', bgcolor: 'surface.main' }}>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400, mb: 1 }}>
            Link Expired
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
            This download link is no longer active. It may have expired or been revoked by the photographer.
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            Please contact your photographer to request a new download link.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Verify state
  if (pageState === 'verify') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Paper sx={{ maxWidth: 420, width: '100%', p: { xs: 2, sm: 4 }, bgcolor: 'surface.main' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LockIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="overline" sx={{ color: 'primary.main', display: 'block' }}>
              {APP_NAME}
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400, mt: 1 }}>
              Verify Your Identity
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Enter the verification code sent to your email to access downloads
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {otpSent && !error && (
            <Alert severity="success" sx={{ mb: 3 }}>
              A verification code has been sent to {email}
            </Alert>
          )}

          {!otpSent ? (
            <Box component="form" onSubmit={handleSendOtp}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => { if (!validation?.realtor?.email) setEmail(e.target.value); }}
                required
                slotProps={{ input: { readOnly: !!validation?.realtor?.email } }}
                sx={{ mb: 3 }}
                helperText={validation?.realtor?.email
                  ? 'Verification will be sent to this email'
                  : 'Use the email address linked to your realtor profile'}
              />
              <Button fullWidth type="submit" variant="contained" size="large" disabled={verifying} sx={{ py: 1.5 }}>
                {verifying ? <CircularProgress size={22} color="inherit" /> : 'Send Verification Code'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerifyOtp}>
              <TextField
                fullWidth
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                sx={{ mb: 3 }}
                helperText="Enter the 6-digit code sent to your email"
              />
              <Button fullWidth type="submit" variant="contained" size="large" disabled={verifying} sx={{ py: 1.5 }}>
                {verifying ? <CircularProgress size={22} color="inherit" /> : 'Verify & Access Downloads'}
              </Button>
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="text"
                  disabled={resendCountdown > 0}
                  onClick={handleResendOtp}
                  sx={{ color: resendCountdown > 0 ? 'text.disabled' : 'primary.main' }}
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Verification Code'}
                </Button>
                {resendCountdown > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={(resendCountdown / RESEND_COOLDOWN) * 100}
                    sx={{ mt: 0.5, borderRadius: 1, height: 4, bgcolor: 'rgba(200,164,93,0.1)', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }}
                  />
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }

  // Ready state
  const featureSheetTabIndex = validation?.listing?.slug ? mediaGroups.length : -1;
  const isFeatureSheetTab = activeTab === featureSheetTabIndex && featureSheetTabIndex >= 0;
  const activeGroup = isFeatureSheetTab ? null : (mediaGroups[activeTab] || mediaGroups[0]);
  const totalSize = media.reduce((sum, a) => sum + a.file_size_bytes, 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, sm: 5 }, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ width: '100%', maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: 'primary.main', mb: 0.5, display: 'block' }}>
            {APP_NAME}
          </Typography>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 400, mb: 0.5, fontSize: { xs: '1.4rem', sm: '2rem', md: '3rem' }, wordBreak: 'break-word' }}>
            {getAddress()}, {validation?.listing?.city}, {validation?.listing?.province_state}
          </Typography>
          {validation?.realtor && (
            <Chip
              label={`Shared with ${validation.realtor.full_name}`}
              size="small"
              variant="outlined"
              sx={{ mt: 1.5, borderColor: 'divider', color: 'text.secondary' }}
            />
          )}
          {validation?.listing?.slug && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => window.open(`/realtor/marketing/${validation.listing!.slug}${token ? `?t=${token}` : ''}`, '_blank')}
                sx={{ borderColor: 'rgba(200,164,93,0.4)', color: 'primary.main', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(200,164,93,0.06)' } }}
              >
                All Marketing Tools
              </Button>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {mediaGroups.length === 0 ? (
          <Paper sx={{ p: 6, bgcolor: 'surface.main', textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>
              No downloadable media available
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
              The photographer has not yet uploaded media for this listing.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Download All Assets button */}
            {mediaGroups.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={streamRunning['all'] ? <CircularProgress size={18} color="inherit" /> : <FolderZipIcon />}
                    disabled={!!streamRunning['all']}
                    onClick={() => handleStream('all')}
                  >
                    {streamRunning['all'] ? 'Downloading...' : `Download All (${formatBytes(totalSize)})`}
                  </Button>
                </Box>
                {streamRunning['all'] && streamProgress['all'] && (
                  <StreamProgressBar progress={streamProgress['all']} />
                )}
              </Box>
            )}

            <Paper sx={{ bgcolor: 'surface.main', overflow: 'hidden' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={(_e, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTab-root': { minHeight: 56, minWidth: { xs: 'auto', sm: 90 }, textTransform: 'none', color: 'text.secondary', px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, '&.Mui-selected': { color: 'primary.main' } },
                  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                  '& .MuiTabs-scrollButtons': { color: 'text.secondary', '&.Mui-disabled': { opacity: 0.3 } },
                }}
              >
                {mediaGroups.map((group) => (
                  <Tab
                    key={group.kind}
                    icon={<Badge badgeContent={group.assets.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>{group.icon}</Badge>}
                    iconPosition="start"
                    label={group.label}
                  />
                ))}
                {validation?.listing?.slug && (
                  <Tab
                    key="feature-sheet"
                    icon={<PictureAsPdfIcon />}
                    iconPosition="start"
                    label="Feature Sheet"
                    sx={{ '& .MuiTab-iconWrapper': { color: 'primary.main' } }}
                  />
                )}
              </Tabs>
            </Box>

            {/* Tab Content */}
            {activeGroup && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Group header with category download */}
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {activeGroup.assets.length} {activeGroup.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Total size: {formatBytes(activeGroup.totalSize)}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="medium"
                    startIcon={
                      streamRunning[activeGroup.kind]
                        ? <CircularProgress size={16} color="inherit" />
                        : <DownloadIcon />
                    }
                    disabled={!!streamRunning[activeGroup.kind]}
                    onClick={() => handleCategoryDownload(activeGroup)}
                  >
                    {streamRunning[activeGroup.kind]
                      ? 'Downloading...'
                      : `Download ${activeGroup.label} (${formatBytes(activeGroup.totalSize)})`
                    }
                  </Button>
                </Stack>

                {/* Category stream progress */}
                {streamRunning[activeGroup.kind] && streamProgress[activeGroup.kind] && (
                  <StreamProgressBar progress={streamProgress[activeGroup.kind]} sx={{ mb: 3 }} />
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Thumbnail grid for photos and floor plans */}
                {(activeGroup.kind === 'photo' || activeGroup.kind === 'floor_plan') ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: { xs: 1, sm: 2 } }}>
                    {activeGroup.assets.map((asset, idx) => (
                      <ThumbnailCard
                        key={asset.id}
                        asset={asset}
                        index={idx}
                        isDownloading={!!downloading[asset.id]}
                        onDownload={() => handleDownloadSingle(asset, idx)}
                        onOpen={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                        progress={downloadProgress[asset.id]}
                      />
                    ))}
                  </Box>
                ) : activeGroup.kind === 'video' ? (
                  <Stack spacing={1.5}>
                    {activeGroup.assets.map((asset, idx) => (
                      <VideoRow
                        key={asset.id}
                        asset={asset}
                        index={idx}
                        isDownloading={!!downloading[asset.id]}
                        onDownload={() => handleDownloadSingle(asset, idx)}
                        address={getAddress()}
                        progress={downloadProgress[asset.id]}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Stack spacing={0}>
                    {activeGroup.assets.map((asset, idx) => (
                      <DocumentRow
                        key={asset.id}
                        asset={asset}
                        index={idx}
                        isDownloading={!!downloading[asset.id]}
                        onDownload={() => handleDownloadSingle(asset, idx)}
                        address={getAddress()}
                        progress={downloadProgress[asset.id]}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* Feature Sheet Tab Panel */}
            {isFeatureSheetTab && (
              <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
                <PictureAsPdfIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400, mb: 1 }}>
                  Create Your Feature Sheet
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
                  Choose from 8 professional brochure templates and download your branded feature sheet as a print-ready PDF. No design skills required.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                  <Paper sx={{ p: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: 1, maxWidth: 240 }}>
                    <DescriptionIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.5 }}>Letter Format</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block' }}>
                      2-page cover + photo gallery. Print on standard letter paper.
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: 1, maxWidth: 240 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.5 }}>Booklet Format</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, display: 'block' }}>
                      4-page bi-fold brochure with up to 16 photos. Premium presentation.
                    </Typography>
                  </Paper>
                </Stack>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => window.location.href = `/realtor/marketing/${validation!.listing!.slug}${token ? `?t=${token}` : ''}`}
                  sx={{ px: 5, py: 1.5, mb: 2 }}
                >
                  Create Your Feature Sheet
                </Button>

                <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 400, mx: 'auto' }}>
                  Also includes: Social Media Posts and Video Reels
                </Typography>
              </Box>
            )}
          </Paper>
          </>
        )}

        {/* Summary footer */}
        {mediaGroups.length > 0 && (
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 3 }}>
            {mediaGroups.map((group) => (
              <Chip
                key={group.kind}
                icon={<CheckCircleIcon />}
                label={`${group.assets.length} ${group.label}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'divider', color: 'text.secondary', '& .MuiChip-icon': { color: 'success.main' } }}
              />
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {APP_NAME} &middot; Download Center
          </Typography>
        </Box>
      </Box>

      {/* Lightbox */}
      {lightboxOpen && activeGroup && (activeGroup.kind === 'photo' || activeGroup.kind === 'floor_plan') && (
        <Lightbox
          assets={activeGroup.assets}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </Box>
  );
}

function StreamProgressBar({ progress, sx }: { progress: StreamProgress; sx?: object }) {
  const pct = progress.expectedBytes > 0
    ? Math.min(100, Math.floor((progress.bytesDelivered / progress.expectedBytes) * 100))
    : 0;

  return (
    <Box sx={{ mt: 1, ...sx }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
        {formatBytes(progress.bytesDelivered)} / {formatBytes(progress.expectedBytes)} &middot; {progress.filesDelivered}/{progress.expectedFileCount} files ({pct}%)
      </Typography>
    </Box>
  );
}

function ThumbnailCard({ asset, index, isDownloading, onDownload, onOpen, progress }: {
  asset: MediaAsset;
  index: number;
  isDownloading: boolean;
  onDownload: () => void;
  onOpen: () => void;
  progress?: SingleFileProgress;
}) {
  const src = asset.thumbnail_url || asset.public_url || '';
  const pct = progress && progress.expectedBytes > 0
    ? Math.min(100, Math.floor((progress.bytesDelivered / progress.expectedBytes) * 100))
    : 0;

  return (
    <Box
      onClick={onOpen}
      sx={{
        position: 'relative',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'background.default',
        cursor: 'pointer',
        '&:hover': { opacity: 0.92 },
        transition: 'opacity 0.15s',
      }}
    >
      <Box
        component="img"
        src={src}
        alt={asset.alt_text || `${asset.kind} ${index + 1}`}
        loading={index < 6 ? 'eager' : 'lazy'}
        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        draggable={false}
        sx={{
          width: '100%',
          height: 'auto',
          display: 'block',
          userSelect: 'none',
          WebkitUserDrag: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          pointerEvents: 'none',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: { xs: '0.55rem', sm: '0.65rem', md: '0.7rem' },
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            transform: 'rotate(-30deg)',
            whiteSpace: 'nowrap',
          }}
        >
          {WATERMARK_TEXT}
        </Typography>
        <Typography
          sx={{
            color: 'rgba(0,0,0,0.35)',
            fontSize: { xs: '0.55rem', sm: '0.65rem', md: '0.7rem' },
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            transform: 'rotate(-30deg)',
            whiteSpace: 'nowrap',
          }}
        >
          {WATERMARK_TEXT}
        </Typography>
      </Box>
      <Tooltip title="Download original" placement="top" arrow>
        <span style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDownload(); }}
            disabled={isDownloading}
            sx={{
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
              width: 32,
              height: 32,
            }}
          >
            {isDownloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 40, px: 1, py: 0.5, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
          {isDownloading && progress
            ? `${pct}% \u00B7 ${formatBytes(progress.bytesDelivered)} / ${formatBytes(progress.expectedBytes)}`
            : `${formatBytes(asset.file_size_bytes)}${asset.width && asset.height ? ` \u00B7 ${asset.width}\u00D7${asset.height}` : ''}`
          }
        </Typography>
      </Box>
      {isDownloading && progress && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
          }}
        />
      )}
    </Box>
  );
}

function VideoRow({ asset, index, isDownloading, onDownload, address, progress }: {
  asset: MediaAsset;
  index: number;
  isDownloading: boolean;
  onDownload: () => void;
  address: string;
  progress?: SingleFileProgress;
}) {
  const posterSrc = asset.poster_url || asset.thumbnail_url || '';
  const displayName = buildDownloadFilename(address, asset.kind, index, asset.filename_original);
  const pct = progress && progress.expectedBytes > 0
    ? Math.min(100, Math.floor((progress.bytesDelivered / progress.expectedBytes) * 100))
    : 0;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ p: 1.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box
          sx={{ position: 'relative', width: { xs: 80, sm: 120 }, height: { xs: 45, sm: 68 }, borderRadius: 1, overflow: 'hidden', flexShrink: 0, bgcolor: 'background.default' }}
          onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        >
          {posterSrc && (
            <Box component="img" src={posterSrc} alt="" draggable={false} sx={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }} />
          )}
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <PlayCircleOutlineIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 32 }} />
          </Box>
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.45rem', fontWeight: 700, letterSpacing: 1, transform: 'rotate(-20deg)', whiteSpace: 'nowrap' }}>
              {WATERMARK_TEXT}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {isDownloading && progress
              ? `${formatBytes(progress.bytesDelivered)} / ${formatBytes(progress.expectedBytes)} (${pct}%)`
              : `${formatBytes(asset.file_size_bytes)}${asset.duration_seconds ? ` \u00B7 ${Math.floor(asset.duration_seconds / 60)}:${String(Math.floor(asset.duration_seconds % 60)).padStart(2, '0')}` : ''}`
            }
          </Typography>
        </Box>
        <Tooltip title="Download original">
          <span>
            <IconButton size="small" onClick={onDownload} disabled={isDownloading} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              {isDownloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {isDownloading && progress && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mx: 1.5,
            height: 4,
            borderRadius: 1,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
          }}
        />
      )}
    </Box>
  );
}

function DocumentRow({ asset, index, isDownloading, onDownload, address, progress }: {
  asset: MediaAsset;
  index: number;
  isDownloading: boolean;
  onDownload: () => void;
  address: string;
  progress?: SingleFileProgress;
}) {
  const displayName = buildDownloadFilename(address, asset.kind, index, asset.filename_original);
  const pct = progress && progress.expectedBytes > 0
    ? Math.min(100, Math.floor((progress.bytesDelivered / progress.expectedBytes) * 100))
    : 0;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ py: 1.5, px: 2, borderRadius: 1, transition: 'background-color 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box sx={{ color: 'text.disabled', display: 'flex', flexShrink: 0 }}>
          <InsertDriveFileIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {isDownloading && progress
              ? `${formatBytes(progress.bytesDelivered)} / ${formatBytes(progress.expectedBytes)} (${pct}%)`
              : formatBytes(asset.file_size_bytes)
            }
          </Typography>
        </Box>
        <Tooltip title="Download file">
          <span>
            <IconButton size="small" onClick={onDownload} disabled={isDownloading} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              {isDownloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {isDownloading && progress && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mx: 2,
            height: 4,
            borderRadius: 1,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
          }}
        />
      )}
    </Box>
  );
}

function Lightbox({ assets, currentIndex, onClose, onNavigate }: {
  assets: MediaAsset[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const asset = assets[currentIndex];
  const src = asset?.public_url || asset?.thumbnail_url || '';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < assets.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, assets.length, onClose, onNavigate]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!asset) return null;

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        bgcolor: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff' } }}
      >
        <CloseIcon />
      </IconButton>

      {/* Counter */}
      <Typography
        variant="body2"
        sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)' }}
      >
        {currentIndex + 1} / {assets.length}
      </Typography>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <IconButton
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          sx={{
            position: 'absolute',
            left: { xs: 8, sm: 24 },
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.7)',
            bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' },
          }}
        >
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
      )}

      {/* Right arrow */}
      {currentIndex < assets.length - 1 && (
        <IconButton
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          sx={{
            position: 'absolute',
            right: { xs: 8, sm: 24 },
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.7)',
            bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' },
          }}
        >
          <ChevronRightIcon fontSize="large" />
        </IconButton>
      )}

      {/* Image container */}
      <Box
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        sx={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="img"
          src={src}
          alt={asset.alt_text || `Photo ${currentIndex + 1}`}
          draggable={false}
          sx={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
            WebkitUserDrag: 'none',
          }}
        />
        {/* Watermark overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {[
            { color: 'rgba(255,255,255,0.3)', offset: '-20%' },
            { color: 'rgba(0,0,0,0.3)', offset: '-5%' },
            { color: 'rgba(255,255,255,0.3)', offset: '10%' },
            { color: 'rgba(0,0,0,0.3)', offset: '25%' },
          ].map((wm, i) => (
            <Typography
              key={i}
              sx={{
                color: wm.color,
                fontSize: { xs: '1rem', sm: '1.4rem', md: '1.8rem' },
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                transform: `rotate(-30deg) translateX(${wm.offset})`,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {WATERMARK_TEXT}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
