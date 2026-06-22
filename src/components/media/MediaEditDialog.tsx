import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import type { MediaAsset, MediaKind } from '../../types/database';

const KIND_OPTIONS: { value: MediaKind; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'floor_plan', label: 'Floor Plan' },
];

interface MediaEditDialogProps {
  open: boolean;
  asset: MediaAsset | null;
  onClose: () => void;
  onSave: (fields: { caption: string | null; alt_text: string | null; is_public: boolean; kind?: MediaKind }) => void;
  saving?: boolean;
}

export default function MediaEditDialog({ open, asset, onClose, onSave, saving }: MediaEditDialogProps) {
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [kind, setKind] = useState<MediaKind>('photo');

  useEffect(() => {
    if (asset) {
      setCaption(asset.caption || '');
      setAltText(asset.alt_text || '');
      setIsPublic(asset.is_public);
      setKind(asset.kind);
    }
  }, [asset]);

  const handleSave = () => {
    onSave({
      caption: caption.trim() || null,
      alt_text: altText.trim() || null,
      is_public: isPublic,
      kind: kind !== asset?.kind ? kind : undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Media Details</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        <TextField
          label="Category"
          select
          value={kind}
          onChange={(e) => setKind(e.target.value as MediaKind)}
          fullWidth
          helperText="Change the category to move this file between tabs"
        >
          {KIND_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          multiline
          rows={2}
          fullWidth
          placeholder="Add a caption visible on the public page"
        />
        <TextField
          label="Alt Text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          fullWidth
          placeholder="Describe the image for accessibility"
          helperText="Used by screen readers and search engines"
        />
        <FormControlLabel
          control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
          label="Publicly visible"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
