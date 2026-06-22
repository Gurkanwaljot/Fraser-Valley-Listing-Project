import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideocamIcon from '@mui/icons-material/Videocam';
import DescriptionIcon from '@mui/icons-material/Description';
import MapIcon from '@mui/icons-material/Map';
import { requestStreamManifest } from '../../services/streamDownloadService';
import { streamZipDownload, type StreamProgress } from '../../services/streamZipDownload';
import { useToast } from '../../hooks/useToast';
import type { DownloadCategory } from '../../types/database';

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  photo: { label: 'Photos', icon: <PhotoLibraryIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> },
  video: { label: 'Videos', icon: <VideocamIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> },
  document: { label: 'Documents', icon: <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> },
  floor_plan: { label: 'Floor Plans', icon: <MapIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> },
  all: { label: 'All Assets', icon: <FolderZipIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface Props {
  listingId: string;
}

export default function DownloadPanel({ listingId }: Props) {
  const { showToast } = useToast();
  const [streamRunning, setStreamRunning] = useState<Record<string, boolean>>({});
  const [streamProgress, setStreamProgress] = useState<Record<string, StreamProgress>>({});

  const handleStream = async (kind: DownloadCategory) => {
    if (streamRunning[kind]) return;
    setStreamRunning((prev) => ({ ...prev, [kind]: true }));
    setStreamProgress((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
    try {
      const manifest = await requestStreamManifest(listingId, kind);
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
        showToast(
          `Download truncated: got ${formatBytes(result.bytesDelivered)} of ~${formatBytes(manifest.expectedBytes)}`,
          'error',
        );
      } else {
        showToast(`Download complete (${formatBytes(result.bytesDelivered)})`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      showToast(message, 'error');
    }
    setStreamRunning((prev) => ({ ...prev, [kind]: false }));
  };

  const kinds: DownloadCategory[] = ['photo', 'video', 'document', 'floor_plan'];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Downloads</Typography>

      <StreamDownloadButton
        kind="all"
        primary
        running={!!streamRunning['all']}
        progress={streamProgress['all']}
        onClick={() => handleStream('all')}
      />

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {kinds.map((kind) => (
          <StreamDownloadButton
            key={kind}
            kind={kind}
            running={!!streamRunning[kind]}
            progress={streamProgress[kind]}
            onClick={() => handleStream(kind)}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function StreamDownloadButton({ kind, primary, running, progress, onClick }: {
  kind: DownloadCategory;
  primary?: boolean;
  running: boolean;
  progress?: StreamProgress;
  onClick: () => void;
}) {
  const meta = KIND_META[kind] || KIND_META.all;
  const startIcon = running
    ? <CircularProgress size={primary ? 16 : 14} color="inherit" />
    : (primary ? <FolderZipIcon sx={{ fontSize: 18 }} /> : <DownloadIcon sx={{ fontSize: 14 }} />);

  const expectedBytes = progress?.expectedBytes ?? 0;
  const expectedFiles = progress?.expectedFileCount ?? 0;
  const deliveredBytes = progress?.bytesDelivered ?? 0;
  const deliveredFiles = progress?.filesDelivered ?? 0;
  const pct = expectedBytes > 0
    ? Math.min(100, Math.floor((deliveredBytes / expectedBytes) * 100))
    : 0;

  return (
    <Box sx={{ width: primary ? '100%' : 'auto' }}>
      <Button
        variant={primary ? 'contained' : 'outlined'}
        color="primary"
        size="small"
        startIcon={startIcon}
        onClick={onClick}
        disabled={running}
        fullWidth={primary}
        sx={{
          fontSize: primary ? '0.8125rem' : '0.6875rem',
          py: primary ? 0.75 : 0.25,
          px: primary ? 2 : 1.25,
          textTransform: 'none',
        }}
      >
        {running
          ? 'Downloading...'
          : primary
            ? `Download ${meta.label}`
            : meta.label
        }
      </Button>
      {running && progress && expectedBytes > 0 && (
        <Box sx={{ mt: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 4,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.625rem' }}>
            {`${formatBytes(deliveredBytes)} / ${formatBytes(expectedBytes)} \u00B7 ${deliveredFiles}/${expectedFiles} files (${pct}%)`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
