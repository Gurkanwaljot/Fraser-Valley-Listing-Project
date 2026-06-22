import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SendIcon from '@mui/icons-material/Send';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BlockIcon from '@mui/icons-material/Block';
import ReplayIcon from '@mui/icons-material/Replay';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import QRCodeDialog from '../../components/common/QRCodeDialog';
import { useListing } from '../../hooks/useListings';
import { useRealtors } from '../../hooks/useRealtors';
import { formatStreetAddress } from '../../services/marketingService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import {
  getListingRealtors,
  assignRealtor,
  unassignRealtor,
  setRealtorAsPrimary,
} from '../../services/listingsService';
import {
  getListingShares,
  createListingShares,
  revokeShare,
  resendShare,
  getShareStatus,
} from '../../services/sharesService';
import type { ListingRealtor } from '../../types/database';
import type { ShareWithRealtor, ShareStatus } from '../../services/sharesService';

interface AssignedRealtor extends ListingRealtor {
  realtor: { full_name: string; email: string };
}

const STATUS_CONFIG: Record<ShareStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
  active: { label: 'Active', color: 'success', icon: <AccessTimeIcon fontSize="small" /> },
  accessed: { label: 'Accessed', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  expired: { label: 'Expired', color: 'warning', icon: <AccessTimeIcon fontSize="small" /> },
  revoked: { label: 'Revoked', color: 'error', icon: <BlockIcon fontSize="small" /> },
};

export default function ListingSharePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: listing, isLoading: listingLoading } = useListing(id);
  const { data: allRealtors } = useRealtors();
  const [assigned, setAssigned] = useState<AssignedRealtor[]>([]);
  const [shares, setShares] = useState<ShareWithRealtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<AssignedRealtor | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareWithRealtor | null>(null);

  const [selectedForShare, setSelectedForShare] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ emailsSent: number; emailsFailed: string[] } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [qrShare, setQrShare] = useState<ShareWithRealtor | null>(null);

  useEffect(() => {
    if (id) {
      Promise.all([
        getListingRealtors(id),
        getListingShares(id),
      ]).then(([realtorData, shareData]) => {
        setAssigned(realtorData as AssignedRealtor[]);
        setShares(shareData);
        setLoading(false);
      });
    }
  }, [id]);

  const refreshShares = async () => {
    if (!id) return;
    const shareData = await getListingShares(id);
    setShares(shareData);
  };

  const availableRealtors = allRealtors?.filter(
    (r) => !assigned.some((a) => a.realtor_id === r.id)
  ) ?? [];

  const handleAssign = async (realtorId: string) => {
    if (!id || !user) return;
    try {
      await assignRealtor(id, realtorId, user.id, assigned.length === 0);
      const updated = await getListingRealtors(id);
      setAssigned(updated as AssignedRealtor[]);
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      showToast('Realtor assigned');
    } catch {
      showToast('Failed to assign realtor', 'error');
    }
  };

  const handleUnassign = async () => {
    if (!removeTarget || !id) return;
    try {
      const wasPrimary = removeTarget.is_primary;
      await unassignRealtor(id, removeTarget.realtor_id);
      setAssigned((prev) => {
        const remaining = prev.filter((a) => a.realtor_id !== removeTarget.realtor_id);
        if (wasPrimary && remaining.length > 0 && !remaining.some((a) => a.is_primary)) {
          remaining[0] = { ...remaining[0], is_primary: true };
        }
        return remaining;
      });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      showToast('Realtor removed');
    } catch {
      showToast('Failed to remove realtor', 'error');
    }
    setRemoveTarget(null);
  };

  const handleSetPrimary = async (realtorId: string) => {
    if (!id) return;
    try {
      await setRealtorAsPrimary(id, realtorId);
      setAssigned((prev) =>
        prev.map((a) => ({ ...a, is_primary: a.realtor_id === realtorId }))
      );
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      showToast('Primary realtor updated');
    } catch {
      showToast('Failed to set primary', 'error');
    }
  };

  const handleToggleShareSelect = (realtorId: string) => {
    setSelectedForShare((prev) =>
      prev.includes(realtorId)
        ? prev.filter((id) => id !== realtorId)
        : [...prev, realtorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedForShare.length === assigned.length) {
      setSelectedForShare([]);
    } else {
      setSelectedForShare(assigned.map((a) => a.realtor_id));
    }
  };

  const handleSendToRealtors = async () => {
    if (!id || !user || selectedForShare.length === 0) return;
    setSending(true);
    setSendResult(null);

    try {
      const result = await createListingShares({
        listingId: id,
        realtorIds: selectedForShare,
        sharedBy: user.id,
        expiresInDays: 5,
      });

      setSendResult({ emailsSent: result.emailsSent, emailsFailed: result.emailsFailed });
      setSelectedForShare([]);
      await refreshShares();

      if (result.emailsFailed.length === 0) {
        showToast(`Sent to ${result.emailsSent} realtor${result.emailsSent !== 1 ? 's' : ''}`);
      } else {
        showToast(`Sent ${result.emailsSent}, failed ${result.emailsFailed.length}`, 'warning');
      }
    } catch {
      showToast('Failed to send share links', 'error');
    }
    setSending(false);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeShare(revokeTarget.id);
      await refreshShares();
      showToast('Share link revoked');
    } catch {
      showToast('Failed to revoke link', 'error');
    }
    setRevokeTarget(null);
  };

  const handleCopyLink = (share: ShareWithRealtor) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/?dl=${listing?.slug}&t=${share.share_token}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard');
  };

  const handleResend = async (share: ShareWithRealtor) => {
    if (!id || !user) return;
    setResendingId(share.id);
    try {
      await resendShare(id, share.realtor_id, user.id);
      await refreshShares();
      showToast(`Resent to ${share.realtor.full_name}`);
    } catch {
      showToast('Failed to resend', 'error');
    }
    setResendingId(null);
  };

  const expiredShares = shares.filter((s) => getShareStatus(s) === 'expired');

  const handleResendAllExpired = async () => {
    if (!id || !user || expiredShares.length === 0) return;
    setResendingAll(true);
    try {
      const realtorIds = expiredShares.map((s) => s.realtor_id);
      await createListingShares({ listingId: id, realtorIds, sharedBy: user.id, expiresInDays: 5 });
      await refreshShares();
      showToast(`Resent to ${realtorIds.length} realtor${realtorIds.length !== 1 ? 's' : ''}`);
    } catch {
      showToast('Failed to resend', 'error');
    }
    setResendingAll(false);
  };

  const getShareUrl = (share: ShareWithRealtor) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?dl=${listing?.slug}&t=${share.share_token}`;
  };

  if (listingLoading || loading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4 }}>
          <Skeleton height={56} sx={{ mb: 3 }} />
          <Skeleton height={200} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/dashboard/listings/${id}`)} sx={{ mb: 2 }}>
        Back to Listing
      </Button>

      <PageHeader
        title="Share with Realtors"
        description={listing ? `${formatStreetAddress(listing)}, ${listing.city}, ${listing.province_state}` : ''}
      />

      {/* Assign Realtor Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>Add Realtor</Typography>
        <Autocomplete
          options={availableRealtors}
          getOptionLabel={(opt) => `${opt.full_name} (${opt.email})`}
          onChange={(_, value) => { if (value) handleAssign(value.id); }}
          renderInput={(params) => (
            <TextField {...params} placeholder="Search and select a realtor..." size="small" />
          )}
          value={null}
          blurOnSelect
        />
      </Paper>

      {/* Send to Realtors Section */}
      {assigned.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              Send to Realtors
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={selectedForShare.length === assigned.length}
                  indeterminate={selectedForShare.length > 0 && selectedForShare.length < assigned.length}
                  onChange={handleSelectAll}
                />
              }
              label={<Typography variant="caption">Select All</Typography>}
            />
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Select realtors to send a download link. Each link expires in 5 days.
          </Typography>

          <List disablePadding>
            {assigned.map((item) => (
              <ListItem key={item.realtor_id} disablePadding sx={{ py: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedForShare.includes(item.realtor_id)}
                      onChange={() => handleToggleShareSelect(item.realtor_id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{item.realtor.full_name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.realtor.email}</Typography>
                    </Box>
                  }
                  sx={{ width: '100%' }}
                />
              </ListItem>
            ))}
          </List>

          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={handleSendToRealtors}
            disabled={selectedForShare.length === 0 || sending}
            sx={{ mt: 2 }}
          >
            {sending ? 'Sending...' : `Send to ${selectedForShare.length} Realtor${selectedForShare.length !== 1 ? 's' : ''}`}
          </Button>

          {sendResult && (
            <Alert
              severity={sendResult.emailsFailed.length > 0 ? 'warning' : 'success'}
              sx={{ mt: 2 }}
              onClose={() => setSendResult(null)}
            >
              {sendResult.emailsSent > 0 && `Email sent to ${sendResult.emailsSent} realtor${sendResult.emailsSent !== 1 ? 's' : ''}.`}
              {sendResult.emailsFailed.length > 0 && ` Failed to send to: ${sendResult.emailsFailed.join(', ')}`}
            </Alert>
          )}
        </Paper>
      )}

      {/* Assigned Realtors */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Assigned Realtors ({assigned.length})
        </Typography>
        {assigned.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No realtors assigned to this listing yet.
          </Typography>
        ) : (
          <List disablePadding>
            {assigned.map((item) => (
              <ListItem key={item.realtor_id} divider sx={{ py: 1.5 }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{item.realtor.full_name}</Typography>
                      {item.is_primary && <Chip label="Primary" size="small" color="primary" variant="outlined" />}
                    </Stack>
                  }
                  secondary={item.realtor.email}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleSetPrimary(item.realtor_id)}
                    title={item.is_primary ? 'Primary realtor' : 'Set as primary'}
                  >
                    {item.is_primary ? <StarIcon color="primary" fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setRemoveTarget(item)}
                    title="Remove realtor"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Share History */}
      {shares.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              Share History
            </Typography>
            {expiredShares.length >= 2 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={resendingAll ? <CircularProgress size={14} color="inherit" /> : <ReplayIcon />}
                onClick={handleResendAllExpired}
                disabled={resendingAll}
              >
                Resend All Expired ({expiredShares.length})
              </Button>
            )}
          </Stack>
          <List disablePadding>
            {shares.map((share) => {
              const status = getShareStatus(share);
              const config = STATUS_CONFIG[status];
              return (
                <ListItem key={share.id} divider sx={{ py: 1.5 }}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{share.realtor.full_name}</Typography>
                        <Chip
                          label={config.label}
                          size="small"
                          color={config.color}
                          variant="outlined"
                          icon={config.icon as React.ReactElement}
                        />
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Sent {new Date(share.created_at).toLocaleDateString()}
                        {share.expires_at && ` \u00B7 Expires ${new Date(share.expires_at).toLocaleDateString()}`}
                        {share.accessed_at && ` \u00B7 Accessed ${new Date(share.accessed_at).toLocaleDateString()}`}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    {(status === 'active' || status === 'accessed') && (
                      <>
                        <Tooltip title="QR Code">
                          <IconButton size="small" onClick={() => setQrShare(share)}>
                            <QrCode2Icon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy download link">
                          <IconButton size="small" onClick={() => handleCopyLink(share)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Revoke link">
                          <IconButton size="small" onClick={() => setRevokeTarget(share)} sx={{ color: 'error.main' }}>
                            <LinkOffIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {status === 'expired' && (
                      <Tooltip title="Resend with new link">
                        <IconButton
                          size="small"
                          onClick={() => handleResend(share)}
                          disabled={resendingId === share.id}
                          color="primary"
                        >
                          {resendingId === share.id ? <CircularProgress size={16} /> : <ReplayIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      <QRCodeDialog
        open={!!qrShare}
        onClose={() => setQrShare(null)}
        url={qrShare ? getShareUrl(qrShare) : ''}
        listingTitle={listing?.title ?? ''}
        listingAddress={listing ? `${formatStreetAddress(listing)}, ${listing.city}, ${listing.province_state}` : ''}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Realtor"
        message={`Remove ${removeTarget?.realtor.full_name} from this listing?`}
        confirmLabel="Remove"
        confirmColor="error"
        onConfirm={handleUnassign}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Share Link"
        message={`This will immediately prevent ${revokeTarget?.realtor.full_name} from accessing downloads. They will see an "expired" message if they click the link.`}
        confirmLabel="Revoke"
        confirmColor="error"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </Box>
  );
}
