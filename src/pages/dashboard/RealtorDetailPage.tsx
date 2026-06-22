import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useRealtor, useDeleteRealtor } from '../../hooks/useRealtors';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../lib/constants';

export default function RealtorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: realtor, isLoading } = useRealtor(id);
  const deleteMutation = useDeleteRealtor();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Realtor permanently deleted');
      navigate(ROUTES.DASHBOARD_REALTORS);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete realtor', 'error');
    }
    setShowDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4 }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Skeleton variant="circular" width={80} height={80} />
            <Box>
              <Skeleton width={200} height={28} />
              <Skeleton width={160} height={20} />
            </Box>
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (!realtor) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.DASHBOARD_REALTORS)}>
          Back to Realtors
        </Button>
        <Paper sx={{ p: 6, mt: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">Realtor not found</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(ROUTES.DASHBOARD_REALTORS)}
        sx={{ mb: 2 }}
      >
        Back to Realtors
      </Button>

      <PageHeader
        title={realtor.full_name}
        description={realtor.brokerage || undefined}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/dashboard/realtors/${id}/edit`)}
            >
              Edit
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'flex-start' }}>
          <Avatar
            src={realtor.headshot_url || undefined}
            sx={{ width: 80, height: 80, bgcolor: 'primary.dark', fontSize: '2rem' }}
          >
            {realtor.full_name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">{realtor.email}</Typography>
              </Stack>

              {realtor.phone && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">{realtor.phone}</Typography>
                </Stack>
              )}

              {realtor.brokerage && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">{realtor.brokerage}</Typography>
                </Stack>
              )}

              {realtor.website_url && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <LanguageIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="primary.main">
                    {realtor.website_url}
                  </Typography>
                </Stack>
              )}
            </Stack>

            {realtor.bio && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {realtor.bio}
                </Typography>
              </>
            )}

            {(realtor.instagram_url || realtor.linkedin_url) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1}>
                  {realtor.instagram_url && (
                    <Tooltip title="Instagram">
                      <IconButton
                        size="small"
                        component="a"
                        href={realtor.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'text.secondary' }}
                      >
                        <InstagramIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {realtor.linkedin_url && (
                    <Tooltip title="LinkedIn">
                      <IconButton
                        size="small"
                        component="a"
                        href={realtor.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'text.secondary' }}
                      >
                        <LinkedInIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </>
            )}

            {realtor.is_archived && (
              <>
                <Divider sx={{ my: 2 }} />
                <Chip label="Archived" color="warning" variant="outlined" size="small" />
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Realtor Permanently"
        message={`Are you sure you want to permanently delete ${realtor.full_name}? This will remove them from all listing assignments and cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Box>
  );
}
