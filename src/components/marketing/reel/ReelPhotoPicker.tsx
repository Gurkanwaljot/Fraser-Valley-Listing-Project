import { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { MediaAsset } from '../../../types/database';

interface ReelPhotoPickerProps {
  photos: MediaAsset[];
  selected: string[];
  onChange: (ids: string[]) => void;
  maxPhotos: number;
}

function getThumbUrl(asset: MediaAsset): string {
  return asset.thumbnail_url || asset.public_url || asset.large_url || '';
}

export default function ReelPhotoPicker({ photos, selected, onChange, maxPhotos }: ReelPhotoPickerProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragData = useRef<{ id: string; startIdx: number } | null>(null);

  const togglePhoto = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < maxPhotos) {
      onChange([...selected, id]);
    }
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragData.current = { id: selected[idx], startIdx: idx };
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (!dragData.current) return;
    const { startIdx } = dragData.current;
    if (startIdx === dropIdx) return;

    const newOrder = [...selected];
    const [moved] = newOrder.splice(startIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    onChange(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
    dragData.current = null;
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
    dragData.current = null;
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.5 }}>
        Selected Photos ({selected.length}/{maxPhotos})
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Select 5-20 photos. Drag to reorder. First photo = hero (intro).
      </Typography>

      {/* Selected strip (drag-reorder) */}
      {selected.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2, p: 1, bgcolor: 'surface.light', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          {selected.map((id, idx) => {
            const photo = photos.find(p => p.id === id);
            if (!photo) return null;
            return (
              <Box
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'grab',
                  opacity: dragIdx === idx ? 0.4 : 1,
                  border: 2,
                  borderColor: dragOverIdx === idx ? 'primary.main' : 'transparent',
                  transition: 'border-color 0.15s, opacity 0.15s',
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Box
                  component="img"
                  src={getThumbUrl(photo)}
                  alt={`Photo ${idx + 1}`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    px: 0.5,
                    borderRadius: 0.5,
                    bgcolor: idx === 0 ? 'primary.main' : 'rgba(0,0,0,0.7)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>
                    {idx === 0 ? 'HERO' : idx + 1}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Photo grid (select/deselect) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {photos.map((photo) => {
          const isSelected = selected.includes(photo.id);
          const order = selected.indexOf(photo.id) + 1;
          const canAdd = selected.length < maxPhotos;
          return (
            <Box
              key={photo.id}
              onClick={() => togglePhoto(photo.id)}
              sx={{
                width: 60,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: !isSelected && !canAdd ? 'not-allowed' : 'pointer',
                position: 'relative',
                border: 2,
                borderColor: isSelected ? 'primary.main' : 'transparent',
                opacity: isSelected ? 1 : canAdd ? 0.65 : 0.35,
                transition: 'all 0.15s',
                '&:hover': { opacity: isSelected || canAdd ? 1 : 0.35 },
              }}
            >
              <Box
                component="img"
                src={getThumbUrl(photo)}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {isSelected && (
                <Chip
                  label={order}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
