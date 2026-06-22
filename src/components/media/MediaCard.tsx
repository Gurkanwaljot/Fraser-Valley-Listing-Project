import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import PhotoIcon from '@mui/icons-material/Photo';
import VideocamIcon from '@mui/icons-material/Videocam';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import type { MediaAsset } from '../../types/database';

interface MediaCardProps {
  asset: MediaAsset;
  onSetHero: () => void;
  onEditDetails: () => void;
  onTogglePublic: () => void;
  onDelete: () => void;
  onChoosePoster?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragTarget?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function KindIcon({ kind }: { kind: string }) {
  switch (kind) {
    case 'video': return <VideocamIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
    case 'document': return <PictureAsPdfIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
    default: return <PhotoIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
  }
}

export default function MediaCard({
  asset,
  onSetHero,
  onEditDetails,
  onTogglePublic,
  onDelete,
  onChoosePoster,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget,
}: MediaCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const thumbnailSrc = asset.kind === 'video'
    ? asset.poster_url
    : (asset.thumbnail_url || (asset.kind === 'photo' ? asset.public_url : null));
  const showImage = Boolean(thumbnailSrc);

  return (
    <Box
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: isDragTarget ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        transition: (theme) => theme.transitions.create(['border-color', 'box-shadow'], {
          duration: theme.transitions.duration.short,
        }),
        '&:hover': { borderColor: 'primary.dark' },
        '&:hover .media-card-actions': { opacity: 1 },
        cursor: draggable ? 'grab' : 'default',
        '&:active': draggable ? { cursor: 'grabbing' } : {},
      }}
    >
      {/* Thumbnail / Preview */}
      <Box sx={{ position: 'relative', width: '100%', paddingTop: '75%', bgcolor: 'action.hover', overflow: 'hidden' }}>
        {showImage ? (
          <Box
            component="img"
            src={thumbnailSrc ?? undefined}
            alt={asset.alt_text || asset.filename_original}
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KindIcon kind={asset.kind} />
          </Box>
        )}

        {/* Hero badge */}
        {asset.is_hero && (
          <Chip
            icon={<StarIcon sx={{ fontSize: 14 }} />}
            label="Hero"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600, fontSize: '0.7rem' }}
          />
        )}

        {/* Private badge */}
        {!asset.is_public && (
          <Chip
            label="Private"
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', color: 'text.primary', fontSize: '0.7rem' }}
          />
        )}

        {/* Duration badge for videos */}
        {asset.kind === 'video' && asset.duration_seconds && (
          <Chip
            label={formatDuration(asset.duration_seconds)}
            size="small"
            sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', color: 'text.primary', fontSize: '0.7rem' }}
          />
        )}

        {/* Kind badge for videos and documents */}
        {asset.kind === 'video' && (
          <Chip
            icon={<VideocamIcon sx={{ fontSize: '14px !important', color: 'common.white !important' }} />}
            size="small"
            sx={{ position: 'absolute', bottom: 8, left: 8, bgcolor: 'rgba(0,0,0,0.7)', color: 'common.white', fontSize: '0.7rem', '& .MuiChip-label': { px: 0.5 } }}
          />
        )}
        {asset.kind === 'document' && (
          <Chip
            icon={<DescriptionIcon sx={{ fontSize: '14px !important', color: 'common.white !important' }} />}
            size="small"
            sx={{ position: 'absolute', bottom: 8, left: 8, bgcolor: 'rgba(0,0,0,0.7)', color: 'common.white', fontSize: '0.7rem', '& .MuiChip-label': { px: 0.5 } }}
          />
        )}

        {/* Hover actions overlay */}
        <Box
          className="media-card-actions"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0,0,0,0.4)',
            opacity: 0,
            transition: (theme) => theme.transitions.create('opacity', { duration: theme.transitions.duration.shorter }),
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            p: 1,
          }}
        >
          {draggable && (
            <DragIndicatorIcon sx={{ color: 'common.white', opacity: 0.8 }} />
          )}
          <Box sx={{ ml: 'auto' }}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'common.white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* File info */}
      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap title={asset.filename_original}>
            {asset.filename_original}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(asset.file_size_bytes)}
            {asset.width && asset.height ? ` | ${asset.width}x${asset.height}` : ''}
          </Typography>
          {asset.caption && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
              {asset.caption}
            </Typography>
          )}
        </Box>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{
              mt: 0.25,
              color: 'text.disabled',
              '&:hover': { color: 'error.main' },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Action menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
        onClick={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {asset.kind === 'photo' && (
          <MenuItem onClick={onSetHero} disabled={asset.is_hero}>
            <ListItemIcon><StarIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Set as Hero</ListItemText>
          </MenuItem>
        )}
        {asset.kind === 'video' && onChoosePoster && (
          <MenuItem onClick={onChoosePoster}>
            <ListItemIcon><CameraAltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Choose Poster</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={onEditDetails}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={onTogglePublic}>
          <ListItemIcon>
            {asset.is_public ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{asset.is_public ? 'Make Private' : 'Make Public'}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
