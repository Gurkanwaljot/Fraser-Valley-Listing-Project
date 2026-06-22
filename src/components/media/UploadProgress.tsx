import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ReplayIcon from '@mui/icons-material/Replay';
import CancelIcon from '@mui/icons-material/Cancel';

export type UploadFileStatus = 'queued' | 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadFileState {
  id: string;
  file: File;
  status: UploadFileStatus;
  progress: number;
  error?: string;
}

interface UploadProgressProps {
  files: UploadFileState[];
  onCancel: (id: string) => void;
  onCancelAll?: () => void;
  onRetry: (id: string) => void;
  onDismiss: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadProgress({ files, onCancel, onCancelAll, onRetry, onDismiss }: UploadProgressProps) {
  if (files.length === 0) return null;

  const completedCount = files.filter((f) => f.status === 'complete').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const allDone = completedCount + errorCount === files.length;
  const hasActiveUploads = uploadingCount > 0 || files.some((f) => f.status === 'queued');

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2">
          {allDone
            ? `${completedCount} of ${files.length} uploaded${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
            : `Uploading... (${completedCount}/${files.length})`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {hasActiveUploads && onCancelAll && (
            <Button
              size="small"
              color="error"
              startIcon={<CancelIcon />}
              onClick={onCancelAll}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Cancel All
            </Button>
          )}
          {allDone && (
            <IconButton size="small" onClick={onDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
        {files.map((item) => (
          <Box
            key={item.id}
            sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {item.file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(item.file.size)}
                </Typography>
              </Box>
              {(item.status === 'uploading' || item.status === 'processing') && (
                <LinearProgress
                  variant={item.status === 'processing' ? 'indeterminate' : 'determinate'}
                  value={item.progress}
                  sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                />
              )}
              {item.status === 'error' && (
                <Typography variant="caption" color="error.main">
                  {item.error || 'Upload failed'}
                </Typography>
              )}
            </Box>
            {item.status === 'queued' && (
              <Chip label="Queued" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
            {item.status === 'uploading' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="primary.main">{item.progress}%</Typography>
                <IconButton size="small" onClick={() => onCancel(item.id)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {item.status === 'complete' && (
              <CheckCircleIcon fontSize="small" color="success" />
            )}
            {item.status === 'error' && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ErrorIcon fontSize="small" color="error" />
                <IconButton size="small" onClick={() => onRetry(item.id)}>
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
