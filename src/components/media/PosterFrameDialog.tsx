import { useState, useRef, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useQueryClient } from '@tanstack/react-query';
import { requestUploadUrl, uploadToR2 } from '../../lib/storage';
import { updatePosterUrl } from '../../services/mediaService';
import type { MediaAsset } from '../../types/database';

interface Props {
  open: boolean;
  asset: MediaAsset;
  listingId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PosterFrameDialog({ open, asset, listingId, onClose, onSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/webp',
      0.75
    );
  }, [previewUrl]);

  const handleSave = useCallback(async () => {
    if (!capturedBlob) return;
    setSaving(true);
    try {
      const filename = asset.filename_original.replace(/\.[^.]+$/, '-poster.webp');
      const file = new File([capturedBlob], filename, { type: 'image/webp' });
      const uploadResult = await requestUploadUrl(file, listingId);
      await uploadToR2(uploadResult.uploadUrl, file);

      const oldPosterKey = asset.poster_url
        ? extractKeyFromUrl(asset.poster_url)
        : undefined;

      await updatePosterUrl(asset.id, uploadResult.publicUrl!, oldPosterKey);
      queryClient.invalidateQueries({ queryKey: ['media', listingId] });
      onSaved();
      handleClose();
    } catch {
      setSaving(false);
    }
  }, [capturedBlob, asset, listingId, onSaved]);

  const handleClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    setSaving(false);
    onClose();
  }, [previewUrl, onClose]);

  const videoSrc = asset.public_url || '';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 400 }}>Choose Poster Frame</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scrub to the frame you want, then capture it as the video thumbnail.
        </Typography>
        <Box
          component="video"
          ref={videoRef}
          src={videoSrc}
          controls
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          sx={{
            width: '100%',
            borderRadius: 1,
            bgcolor: 'background.default',
            maxHeight: 320,
            objectFit: 'contain',
          }}
        />
        <Button
          variant="outlined"
          startIcon={<CameraAltIcon />}
          onClick={handleCapture}
          fullWidth
          sx={{ mt: 2 }}
        >
          Capture This Frame
        </Button>
        {previewUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Preview
            </Typography>
            <Box
              component="img"
              src={previewUrl}
              alt="Captured frame preview"
              sx={{
                width: '100%',
                borderRadius: 1,
                maxHeight: 180,
                objectFit: 'contain',
                bgcolor: 'background.default',
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!capturedBlob || saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save Poster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function extractKeyFromUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
  } catch {
    return undefined;
  }
}
