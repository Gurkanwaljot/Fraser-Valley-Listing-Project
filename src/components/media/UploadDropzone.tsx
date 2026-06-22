import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import type { MediaKind } from '../../types/database';

const ACCEPTED_TYPES: Record<string, MediaKind> = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/webp': 'photo',
  'image/heic': 'photo',
  'image/heif': 'photo',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
};

const MAX_SIZES: Record<MediaKind, number> = {
  photo: 25 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  floor_plan: 25 * 1024 * 1024,
};

export interface ValidatedFile {
  file: File;
  kind: MediaKind;
}

interface UploadDropzoneProps {
  onFilesAccepted: (files: ValidatedFile[]) => void;
  disabled?: boolean;
  kindOverride?: MediaKind;
}

export default function UploadDropzone({ onFilesAccepted, disabled, kindOverride }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [rejections, setRejections] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((fileList: FileList | File[]): { accepted: ValidatedFile[]; rejected: string[] } => {
    const accepted: ValidatedFile[] = [];
    const rejected: string[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      const detectedKind = ACCEPTED_TYPES[file.type];
      if (!detectedKind) {
        rejected.push(`${file.name}: unsupported file type`);
        continue;
      }
      const kind = kindOverride ?? detectedKind;
      const maxSize = MAX_SIZES[kind];
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        rejected.push(`${file.name}: exceeds ${maxMB}MB limit`);
        continue;
      }
      accepted.push({ file, kind });
    }

    return { accepted, rejected };
  }, [kindOverride]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const { accepted, rejected } = validateFiles(e.dataTransfer.files);
    setRejections(rejected);
    if (accepted.length > 0) onFilesAccepted(accepted);
  }, [disabled, onFilesAccepted, validateFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || disabled) return;
    const { accepted, rejected } = validateFiles(e.target.files);
    setRejections(rejected);
    if (accepted.length > 0) onFilesAccepted(accepted);
    e.target.value = '';
  }, [disabled, onFilesAccepted, validateFiles]);

  return (
    <Box>
      <Box
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          bgcolor: isDragOver ? 'action.selected' : 'transparent',
          transition: (theme) => theme.transitions.create(['border-color', 'background-color'], {
            duration: theme.transitions.duration.short,
          }),
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled ? {} : {
            borderColor: 'primary.light',
            bgcolor: 'action.hover',
          },
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: isDragOver ? 'primary.main' : 'text.secondary', mb: 1 }} />
        <Typography variant="subtitle1" color={isDragOver ? 'primary.main' : 'text.primary'}>
          {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Photos (JPEG, PNG, WebP) up to 25MB | Videos (MP4, MOV) up to 500MB | PDFs up to 25MB
        </Typography>
        <Button
          variant="outlined"
          size="small"
          disabled={disabled}
          sx={{ mt: 2 }}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Browse Files
        </Button>
      </Box>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.pdf"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      {rejections.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          {rejections.map((msg, i) => (
            <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block' }}>
              {msg}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
