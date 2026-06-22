import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import PageHeader from '../../components/common/PageHeader';
import { getAuditLogs, getAuditActions, type AuditLogFilters } from '../../services/adminService';
import type { AuditLog, AuditActionCount } from '../../types/database';

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  role_added: 'Role Added',
  role_removed: 'Role Removed',
  user_suspended: 'User Suspended',
  user_unsuspended: 'User Unsuspended',
  user_invited: 'User Invited',
  user_deleted: 'User Deleted',
  invitation_accepted: 'Invitation Accepted',
  invitation_revoked: 'Invitation Revoked',
  invitation_resent: 'Invitation Resent',
  listing_created: 'Listing Created',
  listing_updated: 'Listing Updated',
  listing_deleted: 'Listing Deleted',
  listing_status_changed: 'Status Changed',
  media_uploaded: 'Media Uploaded',
  media_deleted: 'Media Deleted',
  media_hero_changed: 'Hero Changed',
  realtor_created: 'Realtor Created',
  realtor_updated: 'Realtor Updated',
  realtor_archived: 'Realtor Archived',
  realtor_unarchived: 'Realtor Unarchived',
  realtor_deleted: 'Realtor Deleted',
  realtor_assigned: 'Realtor Assigned',
  realtor_unassigned: 'Realtor Unassigned',
  share_created: 'Share Created',
  share_revoked: 'Share Revoked',
  lead_created: 'Lead Received',
};

const ACTION_COLORS: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary'> = {
  listing_created: 'success',
  realtor_created: 'success',
  media_uploaded: 'success',
  share_created: 'success',
  lead_created: 'info',
  listing_deleted: 'error',
  media_deleted: 'error',
  realtor_deleted: 'error',
  user_deleted: 'error',
  user_suspended: 'warning',
  share_revoked: 'warning',
  invitation_revoked: 'warning',
  listing_status_changed: 'primary',
  listing_updated: 'default',
};

function formatChanges(changes: Record<string, { from: unknown; to: unknown }> | null): string {
  if (!changes) return '';
  return Object.entries(changes)
    .map(([field, { from, to }]) => `${field}: ${String(from ?? 'null')} → ${String(to ?? 'null')}`)
    .join('; ');
}

function exportCSV(logs: AuditLog[]) {
  const headers = ['Time', 'Actor', 'Action', 'Entity Type', 'Entity', 'Changes', 'Metadata'];
  const rows = logs.map((log) => [
    new Date(log.created_at).toISOString(),
    log.actor_label || 'System',
    log.action,
    log.entity_type,
    log.entity_label || log.entity_id || '',
    formatChanges(log.changes),
    JSON.stringify(log.metadata || {}),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actions, setActions] = useState<AuditActionCount[]>([]);

  useEffect(() => {
    getAuditActions().then(setActions).catch((err) => {
      if (import.meta.env.DEV) console.error('[AuditPage] Failed to load actions:', err);
    });
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AuditLogFilters = {};
      if (actionFilter) filters.action = actionFilter;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) filters.dateTo = new Date(dateTo + 'T23:59:59').toISOString();

      const result = await getAuditLogs(PAGE_SIZE, page * PAGE_SIZE, filters);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AuditPage] Failed to load logs:', err);
      setLogs([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, actionFilter, search, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Box>
      <PageHeader title="Audit Log" description="Complete system activity history" />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              label="Action"
            >
              <MenuItem value="">All actions</MenuItem>
              {actions.map((a) => (
                <MenuItem key={a.action} value={a.action}>
                  {ACTION_LABELS[a.action] || a.action} ({a.count})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 200 }}>
            <TextField
              size="small"
              placeholder="Search actor, entity, action..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={handleSearch}>
              <SearchIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {total} {total === 1 ? 'entry' : 'entries'}
          </Typography>
          <Button
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Stack spacing={isMobile ? 1.5 : 0.5}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} height={44} />)}
        </Stack>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No audit entries found</Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {logs.map((log) => (
            <Card key={log.id} sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Chip
                      label={ACTION_LABELS[log.action] || log.action}
                      size="small"
                      color={ACTION_COLORS[log.action] || 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.6875rem', height: 22 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {formatDate(log.created_at)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {log.actor_label || 'System'}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {log.entity_label || log.entity_type}
                  </Typography>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <Typography variant="caption" color="text.disabled" noWrap>
                      {formatChanges(log.changes).slice(0, 80)}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 140 }}>Time</TableCell>
                  <TableCell sx={{ width: 150 }}>Actor</TableCell>
                  <TableCell sx={{ width: 160 }}>Action</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell sx={{ width: 220 }}>Changes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(log.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                        {log.actor_label || (
                          <Typography component="span" variant="body2" color="text.disabled">System</Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                        size="small"
                        color={ACTION_COLORS[log.action] || 'default'}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.entity_id || ''} arrow>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {log.entity_label || log.entity_type}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                        <Tooltip title={formatChanges(log.changes)} arrow>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                            {formatChanges(log.changes)}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 3 }}>
          <Button
            size="small"
            startIcon={<NavigateBeforeIcon />}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Typography variant="body2" color="text.secondary">
            Page {page + 1} of {totalPages}
          </Typography>
          <Button
            size="small"
            endIcon={<NavigateNextIcon />}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </Stack>
      )}
    </Box>
  );
}
