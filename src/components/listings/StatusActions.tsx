import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PublishIcon from '@mui/icons-material/Publish';
import ArchiveIcon from '@mui/icons-material/Archive';
import SellIcon from '@mui/icons-material/Sell';
import PendingIcon from '@mui/icons-material/Pending';
import ReplayIcon from '@mui/icons-material/Replay';
import ConfirmDialog from '../common/ConfirmDialog';
import { getValidTransitions } from '../../services/listingsService';
import type { ListingStatus } from '../../types/database';

const ACTION_CONFIG: Record<ListingStatus, { label: string; icon: React.ReactNode; color: 'primary' | 'warning' | 'error' | 'info' }> = {
  active: { label: 'Publish', icon: <PublishIcon />, color: 'primary' },
  pending: { label: 'Mark Pending', icon: <PendingIcon />, color: 'warning' },
  sold: { label: 'Mark Sold', icon: <SellIcon />, color: 'error' },
  archived: { label: 'Archive', icon: <ArchiveIcon />, color: 'info' },
  draft: { label: 'Revert to Draft', icon: <ReplayIcon />, color: 'info' },
};

const CONFIRM_MESSAGES: Record<ListingStatus, string> = {
  active: 'This listing will become publicly visible.',
  pending: 'This listing will be marked as pending sale.',
  sold: 'This listing will be marked as sold and hidden from public view.',
  archived: 'This listing will be archived and hidden from public view.',
  draft: 'This listing will be reverted to draft and hidden from public view.',
};

interface StatusActionsProps {
  currentStatus: ListingStatus;
  loading?: boolean;
  onStatusChange: (newStatus: ListingStatus) => void;
}

export default function StatusActions({ currentStatus, loading, onStatusChange }: StatusActionsProps) {
  const [confirmStatus, setConfirmStatus] = useState<ListingStatus | null>(null);
  const validTransitions = getValidTransitions(currentStatus);

  if (validTransitions.length === 0) return null;

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {validTransitions.map((status) => {
          const config = ACTION_CONFIG[status] || ACTION_CONFIG.active;
          const label = status === 'active' && currentStatus !== 'draft' ? 'Relist' : config.label;
          return (
            <Button
              key={status}
              size="small"
              variant="outlined"
              color={config.color}
              startIcon={status === 'active' && currentStatus !== 'draft' ? <ReplayIcon /> : config.icon}
              onClick={() => setConfirmStatus(status)}
              disabled={loading}
            >
              {label}
            </Button>
          );
        })}
      </Stack>

      <ConfirmDialog
        open={!!confirmStatus}
        title={`Change Status to "${confirmStatus ? ACTION_CONFIG[confirmStatus]?.label || confirmStatus : ''}"?`}
        message={confirmStatus ? CONFIRM_MESSAGES[confirmStatus] : ''}
        confirmLabel="Confirm"
        confirmColor={confirmStatus === 'sold' || confirmStatus === 'archived' ? 'error' : 'primary'}
        loading={loading}
        onConfirm={() => {
          if (confirmStatus) onStatusChange(confirmStatus);
          setConfirmStatus(null);
        }}
        onCancel={() => setConfirmStatus(null)}
      />
    </>
  );
}
