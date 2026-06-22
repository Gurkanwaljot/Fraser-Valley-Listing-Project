import Chip from '@mui/material/Chip';
import type { ListingStatus } from '../../types/database';

const STATUS_CONFIG: Record<ListingStatus, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'success' },
  pending: { label: 'Pending', color: 'warning' },
  sold: { label: 'Sold', color: 'error' },
  archived: { label: 'Archived', color: 'info' },
};

interface StatusChipProps {
  status: ListingStatus;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="outlined"
    />
  );
}
