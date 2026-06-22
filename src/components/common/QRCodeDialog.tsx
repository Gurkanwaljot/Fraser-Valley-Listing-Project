import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import QRCode from 'qrcode';

interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
  listingTitle: string;
  listingAddress: string;
}

export default function QRCodeDialog({ open, onClose, url, listingTitle, listingAddress }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !url || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: {
        dark: '#C8A45D',
        light: '#0B0B0B',
      },
      errorCorrectionLevel: 'M',
    });
  }, [open, url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;

    const padding = 32;
    const labelHeight = 60;
    const source = canvasRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = source.width + padding * 2;
    exportCanvas.height = source.height + padding * 2 + labelHeight;

    const ctx = exportCanvas.getContext('2d')!;
    ctx.fillStyle = '#0B0B0B';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    ctx.strokeStyle = 'rgba(200,164,93,0.3)';
    ctx.lineWidth = 2;
    ctx.roundRect(4, 4, exportCanvas.width - 8, exportCanvas.height - 8, 8);
    ctx.stroke();

    ctx.drawImage(source, padding, padding);

    ctx.fillStyle = '#C8A45D';
    ctx.font = "600 10px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('FRASER VALLEY REAL ESTATE PHOTOGRAPHY', exportCanvas.width / 2, source.height + padding + 24);

    ctx.fillStyle = '#F5F2EC';
    ctx.font = "500 11px 'Hanken Grotesk', sans-serif";
    ctx.fillText(listingTitle, exportCanvas.width / 2, source.height + padding + 44);

    const link = document.createElement('a');
    link.download = `qr-${listingTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper', backgroundImage: 'none' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={500}>Share QR Code</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack alignItems="center" spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'rgba(200,164,93,0.3)',
              bgcolor: '#0B0B0B',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <canvas ref={canvasRef} />
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2">{listingTitle}</Typography>
            <Typography variant="caption" color="text.secondary">{listingAddress}</Typography>
          </Box>

          <Box
            sx={{
              width: '100%',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: 'text.secondary',
              }}
            >
              {url}
            </Typography>
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>

          {copied && (
            <Typography variant="caption" color="success.main">Copied to clipboard</Typography>
          )}

          <Alert severity="info" sx={{ width: '100%' }}>
            <Typography variant="caption">
              Print this QR code on your business card, include it in a property brochure, or display it at an open house. Buyers can scan to instantly access the full listing photos and video.
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleDownloadPng} startIcon={<DownloadIcon />} variant="contained" size="small">
          Download PNG
        </Button>
        <Button onClick={handleCopy} startIcon={<ContentCopyIcon />} variant="outlined" size="small">
          Copy Link
        </Button>
      </DialogActions>
    </Dialog>
  );
}
