import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ShareIcon from '@mui/icons-material/Share';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/listings/StatusChip';
import StatusActions from '../../components/listings/StatusActions';
import DownloadPanel from '../../components/listings/DownloadPanel';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useListing, useChangeListingStatus, useDeleteListing, useDuplicateListing } from '../../hooks/useListings';
import { useHeroMedia } from '../../hooks/useMedia';
import { useToast } from '../../hooks/useToast';
import type { ListingStatus } from '../../types/database';
import { ROUTES } from '../../lib/constants';
import { formatStreetAddress } from '../../services/marketingService';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: listing, isLoading } = useListing(id);
  const { data: heroMedia } = useHeroMedia(id);
  const changeStatus = useChangeListingStatus();
  const deleteListingMutation = useDeleteListing();
  const duplicateListingMutation = useDuplicateListing();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleStatusChange = async (newStatus: ListingStatus) => {
    try {
      await changeStatus.mutateAsync({ id: id!, status: newStatus });
      showToast(`Listing status changed to ${newStatus}`);
    } catch {
      showToast('Failed to change status', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteListingMutation.mutateAsync(id!);
      showToast('Listing deleted');
      navigate(ROUTES.DASHBOARD_LISTINGS);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete listing', 'error');
    }
    setDeleteOpen(false);
  };

  const handleDuplicate = async () => {
    try {
      const newId = await duplicateListingMutation.mutateAsync(id!);
      showToast('Listing duplicated as draft');
      navigate(`/dashboard/listings/${newId}/edit`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to duplicate listing', 'error');
    }
    setDuplicateOpen(false);
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return 'Not set';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: { xs: 2, sm: 4 } }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}><Skeleton height={40} /></Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  if (!listing) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.DASHBOARD_LISTINGS)}>
          Back to Listings
        </Button>
        <Paper sx={{ p: { xs: 3, sm: 6 }, mt: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">Listing not found</Typography>
        </Paper>
      </Box>
    );
  }

  const actions = [
    { label: 'Preview', icon: <VisibilityIcon fontSize="small" />, onClick: () => window.open(`/listing/${listing.slug}`, '_blank') },
    { label: 'Edit', icon: <EditIcon fontSize="small" />, onClick: () => navigate(`/dashboard/listings/${id}/edit`) },
    { label: 'Media', icon: <PhotoLibraryIcon fontSize="small" />, onClick: () => navigate(`/dashboard/listings/${id}/media`) },
    { label: 'Share', icon: <ShareIcon fontSize="small" />, onClick: () => navigate(`/dashboard/listings/${id}/share`) },
    { label: 'Analytics', icon: <BarChartIcon fontSize="small" />, onClick: () => navigate(`/dashboard/listings/${id}/activity`) },
    { label: 'Marketing Kit', icon: <AutoAwesomeIcon fontSize="small" />, onClick: () => window.open(`/realtor/marketing/${listing.slug}`, '_blank') },
    { label: 'Download Center', icon: <DownloadIcon fontSize="small" />, onClick: () => window.open(`/listing/${listing.slug}/download`, '_blank') },
    { label: 'Duplicate', icon: <ContentCopyIcon fontSize="small" />, onClick: () => setDuplicateOpen(true) },
    { label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => setDeleteOpen(true), danger: true },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.DASHBOARD_LISTINGS)} sx={{ mb: 2 }}>
        Back to Listings
      </Button>

      <PageHeader
        title={`${formatStreetAddress(listing)}, ${listing.city}`}
        description={`${listing.province_state} ${listing.postal_code}`}
        action={
          <>
            {/* Mobile: overflow menu */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                size="small"
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{ sx: { bgcolor: 'surface.main', minWidth: 200 } }}
              >
                {actions.map((action) => (
                  <MenuItem
                    key={action.label}
                    onClick={() => { action.onClick(); setMenuAnchor(null); }}
                    sx={{ color: action.danger ? 'error.main' : 'text.primary', py: 1.5 }}
                  >
                    <ListItemIcon sx={{ color: action.danger ? 'error.main' : 'text.secondary', minWidth: 36 }}>
                      {action.icon}
                    </ListItemIcon>
                    <ListItemText primary={action.label} />
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Desktop: button row */}
            <Stack
              direction="row"
              sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 1 }}
            >
              <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={() => window.open(`/listing/${listing.slug}`, '_blank')}>
                Preview
              </Button>
              <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => navigate(`/dashboard/listings/${id}/edit`)}>
                Edit
              </Button>
              <Button variant="outlined" size="small" startIcon={<PhotoLibraryIcon />} onClick={() => navigate(`/dashboard/listings/${id}/media`)}>
                Media
              </Button>
              <Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={() => navigate(`/dashboard/listings/${id}/share`)}>
                Share
              </Button>
              <Button variant="outlined" size="small" startIcon={<BarChartIcon />} onClick={() => navigate(`/dashboard/listings/${id}/activity`)}>
                Analytics
              </Button>
              <Button variant="outlined" size="small" startIcon={<AutoAwesomeIcon />} onClick={() => window.open(`/realtor/marketing/${listing.slug}`, '_blank')}>
                Marketing Kit
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => window.open(`/listing/${listing.slug}/download`, '_blank')}>
                Download Center
              </Button>
              <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => setDuplicateOpen(true)}>
                Duplicate
              </Button>
              <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </Stack>
          </>
        }
      />

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              sx={{ mb: { xs: 2, sm: 3 } }}
            >
              <StatusChip status={listing.status} size="medium" />
              <StatusActions
                currentStatus={listing.status}
                loading={changeStatus.isPending}
                onStatusChange={handleStatusChange}
              />
            </Stack>

            <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Price</Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {formatPrice(listing.price, listing.currency)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Bedrooms</Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{listing.bedrooms ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Bathrooms</Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{listing.bathrooms ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Living Area</Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {listing.square_footage ? `${listing.square_footage.toLocaleString()} sq. ft.` : '-'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: { xs: 2, sm: 3 } }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary">Property Type</Typography>
                <Typography variant="body1">{listing.property_type || 'Not specified'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary">MLS Number</Typography>
                <Typography variant="body1">{listing.mls_number || 'Not set'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary">Year Built</Typography>
                <Typography variant="body1">{listing.year_built || 'Not specified'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary">Lot Size</Typography>
                <Typography variant="body1">{listing.lot_size ? `${listing.lot_size} sq. ft.` : 'Not specified'}</Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="overline" color="text.secondary">Public URL</Typography>
                <Typography variant="body2" color="primary.main">/listing/{listing.slug}</Typography>
              </Grid>
            </Grid>

            {listing.description && (
              <>
                <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                <Typography variant="overline" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {listing.description}
                </Typography>
              </>
            )}

            {listing.features.length > 0 && (
              <>
                <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                <Typography variant="overline" color="text.secondary">Features</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {listing.features.map((f) => <Chip key={f} label={f} size="small" variant="outlined" />)}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            {heroMedia?.public_url && (
              <Paper
                sx={{ overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/dashboard/listings/${id}/media`)}
              >
                <Box
                  component="img"
                  src={heroMedia.thumbnail_url || heroMedia.public_url}
                  alt={heroMedia.alt_text || heroMedia.filename_original}
                  sx={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
                <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography variant="caption" color="text.secondary">Hero Image</Typography>
                </Box>
              </Paper>
            )}
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Assigned Realtors</Typography>
              {listing.realtors.length > 0 ? (
                <Stack spacing={1}>
                  {listing.realtors.map((r) => (
                    <Stack key={r.id} direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{r.full_name}</Typography>
                      {r.is_primary && <Chip label="Primary" size="small" color="primary" variant="outlined" />}
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No realtors assigned yet.
                </Typography>
              )}
              <Button
                size="small"
                sx={{ mt: 2 }}
                onClick={() => navigate(`/dashboard/listings/${id}/share`)}
              >
                Manage Realtors
              </Button>
            </Paper>

            <DownloadPanel listingId={id!} />
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Listing"
        message={`Are you sure you want to permanently delete "${formatStreetAddress(listing)}, ${listing.city}"? This will remove all associated media, shares, and analytics data. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteListingMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={duplicateOpen}
        title="Duplicate Listing"
        message="Duplicate this listing? A new draft will be created with the same details and realtor assignments. Media will not be copied."
        confirmLabel="Duplicate"
        loading={duplicateListingMutation.isPending}
        onConfirm={handleDuplicate}
        onCancel={() => setDuplicateOpen(false)}
      />
    </Box>
  );
}
