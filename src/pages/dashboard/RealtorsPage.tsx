import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonIcon from '@mui/icons-material/Person';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useRealtors, useArchiveRealtor, useUnarchiveRealtor, useDeleteRealtor } from '../../hooks/useRealtors';
import { useToast } from '../../hooks/useToast';
import type { RealtorWithListingCount } from '../../services/realtorsService';

export default function RealtorsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; realtor: RealtorWithListingCount } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<RealtorWithListingCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RealtorWithListingCount | null>(null);

  const { data: realtors, isLoading } = useRealtors({ search: search || undefined, includeArchived: showArchived });
  const archiveMutation = useArchiveRealtor();
  const unarchiveMutation = useUnarchiveRealtor();
  const deleteMutation = useDeleteRealtor();

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      showToast('Realtor archived');
    } catch {
      showToast('Failed to archive realtor', 'error');
    }
    setArchiveTarget(null);
  };

  const handleUnarchive = async (realtor: RealtorWithListingCount) => {
    try {
      await unarchiveMutation.mutateAsync(realtor.id);
      showToast('Realtor restored');
    } catch {
      showToast('Failed to restore realtor', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showToast('Realtor permanently deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete realtor', 'error');
    }
    setDeleteTarget(null);
  };

  return (
    <Box>
      <PageHeader
        title="Realtors"
        description="Manage your realtor network"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/realtors/new')}
          >
            Add Realtor
          </Button>
        }
      />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search realtors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
          label={<Typography variant="body2" color="text.secondary">Show archived</Typography>}
        />
      </Stack>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={24} />
                      <Skeleton width="40%" height={20} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : !realtors?.length ? (
        <EmptyState
          icon={<PersonIcon />}
          title="No realtors yet"
          description="Add your first realtor to start assigning them to listings."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/dashboard/realtors/new')}>
              Add Realtor
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2}>
          {realtors.map((realtor) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={realtor.id}>
              <Card sx={{ position: 'relative', opacity: realtor.is_archived ? 0.6 : 1 }}>
                <CardActionArea onClick={() => navigate(`/dashboard/realtors/${realtor.id}`)}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar
                        src={realtor.headshot_url || undefined}
                        sx={{ width: 48, height: 48, bgcolor: 'primary.dark' }}
                      >
                        {realtor.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {realtor.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {realtor.email}
                        </Typography>
                        {realtor.brokerage && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {realtor.brokerage}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            icon={<HomeWorkIcon />}
                            label={`${realtor.listing_count} listing${realtor.listing_count !== 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                          />
                          {realtor.is_archived && (
                            <Chip label="Archived" size="small" color="warning" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchor({ el: e.currentTarget, realtor });
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          if (menuAnchor) navigate(`/dashboard/realtors/${menuAnchor.realtor.id}/edit`);
          setMenuAnchor(null);
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {menuAnchor?.realtor.is_archived ? (
          <MenuItem onClick={() => {
            if (menuAnchor) handleUnarchive(menuAnchor.realtor);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restore</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => {
            if (menuAnchor) setArchiveTarget(menuAnchor.realtor);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.realtor.is_archived && (
          <MenuItem onClick={() => {
            if (menuAnchor) setDeleteTarget(menuAnchor.realtor);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Delete Permanently</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive Realtor"
        message={`Are you sure you want to archive ${archiveTarget?.full_name}? They will no longer appear in your active realtors list.`}
        confirmLabel="Archive"
        confirmColor="warning"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Realtor Permanently"
        message={`Are you sure you want to permanently delete ${deleteTarget?.full_name}? This will remove them from all listing assignments and cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
