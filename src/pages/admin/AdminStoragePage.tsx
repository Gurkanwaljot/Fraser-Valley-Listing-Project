import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import PhotoIcon from '@mui/icons-material/Photo';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ImageIcon from '@mui/icons-material/Image';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import {
  getStorageStats,
  listObjects,
  deleteObject,
  deletePrefix,
  listMultipartUploads,
  abortMultipartUpload,
  abortAllStaleMultiparts,
  findOrphans,
  getListingStorage,
  deleteListingStorage,
  type BucketStats,
  type S3Object,
  type MultipartUpload,
  type OrphanResult,
  type ListingStorageItem,
} from '../../services/storageAdminService';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'photos': return <PhotoIcon sx={{ color: 'info.main' }} />;
    case 'videos': return <VideoFileIcon sx={{ color: 'warning.main' }} />;
    case 'documents': return <DescriptionIcon sx={{ color: 'success.main' }} />;
    case 'zips': return <FolderZipIcon sx={{ color: 'secondary.main' }} />;
    case 'thumbnails': return <ImageIcon sx={{ color: 'text.secondary' }} />;
    default: return <StorageIcon sx={{ color: 'text.secondary' }} />;
  }
}

export default function AdminStoragePage() {
  const { showToast } = useToast();

  const [stats, setStats] = useState<BucketStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [objects, setObjects] = useState<S3Object[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [searchPrefix, setSearchPrefix] = useState('');
  const [nextToken, setNextToken] = useState<string | null>(null);

  const [uploads, setUploads] = useState<MultipartUpload[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  const [orphanData, setOrphanData] = useState<OrphanResult | null>(null);
  const [orphansLoading, setOrphansLoading] = useState(false);

  const [listingStorageData, setListingStorageData] = useState<ListingStorageItem[]>([]);
  const [listingStorageLoading, setListingStorageLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ key: string; type: 'object' | 'prefix' } | null>(null);
  const [abortTarget, setAbortTarget] = useState<MultipartUpload | null>(null);
  const [abortAllConfirm, setAbortAllConfirm] = useState(false);
  const [deleteListingTarget, setDeleteListingTarget] = useState<ListingStorageItem | null>(null);
  const [deleteOrphansConfirm, setDeleteOrphansConfirm] = useState(false);
  const [orphanDeleteProgress, setOrphanDeleteProgress] = useState<{
    active: boolean;
    total: number;
    deleted: number;
    failed: number;
  } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getStorageStats();
      setStats(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load stats', 'error');
    }
    setStatsLoading(false);
  }, [showToast]);

  const loadObjects = useCallback(async (pfx: string, token?: string) => {
    setObjectsLoading(true);
    try {
      const data = await listObjects(pfx || undefined, token || undefined);
      if (token) {
        setObjects((prev) => [...prev, ...data.objects]);
      } else {
        setObjects(data.objects);
      }
      setNextToken(data.isTruncated ? data.nextToken : null);
      setPrefix(pfx);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to list objects', 'error');
    }
    setObjectsLoading(false);
  }, [showToast]);

  const loadUploads = useCallback(async () => {
    setUploadsLoading(true);
    try {
      const data = await listMultipartUploads();
      setUploads(data.uploads);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to list uploads', 'error');
    }
    setUploadsLoading(false);
  }, [showToast]);

  const loadOrphans = useCallback(async () => {
    setOrphansLoading(true);
    try {
      const data = await findOrphans();
      setOrphanData(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to scan orphans', 'error');
    }
    setOrphansLoading(false);
  }, [showToast]);

  const loadListingStorage = useCallback(async () => {
    setListingStorageLoading(true);
    try {
      const data = await getListingStorage();
      setListingStorageData(data.listings);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load listing storage', 'error');
    }
    setListingStorageLoading(false);
  }, [showToast]);

  const handleDeleteObject = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'object') {
        await deleteObject(deleteTarget.key);
        showToast('File deleted');
        setObjects((prev) => prev.filter((o) => o.key !== deleteTarget.key));
      } else {
        const result = await deletePrefix(deleteTarget.key);
        showToast(`Deleted ${result.deleted} files from ${deleteTarget.key}`);
        loadObjects(prefix);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
    setActionLoading(false);
    setDeleteTarget(null);
  };

  const handleAbortUpload = async () => {
    if (!abortTarget) return;
    setActionLoading(true);
    try {
      await abortMultipartUpload(abortTarget.key, abortTarget.uploadId);
      showToast('Multipart upload aborted');
      setUploads((prev) => prev.filter((u) => u.uploadId !== abortTarget.uploadId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Abort failed', 'error');
    }
    setActionLoading(false);
    setAbortTarget(null);
  };

  const handleAbortAllStale = async () => {
    setActionLoading(true);
    try {
      const result = await abortAllStaleMultiparts();
      showToast(`Aborted ${result.aborted} stale uploads (${result.failed} failed)`);
      loadUploads();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cleanup failed', 'error');
    }
    setActionLoading(false);
    setAbortAllConfirm(false);
  };

  const handleDeleteListingStorage = async () => {
    if (!deleteListingTarget) return;
    setActionLoading(true);
    try {
      const result = await deleteListingStorage(deleteListingTarget.id);
      showToast(`Deleted ${result.deleted} files for "${deleteListingTarget.title}"`);
      setListingStorageData((prev) => prev.filter((l) => l.id !== deleteListingTarget.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
    setActionLoading(false);
    setDeleteListingTarget(null);
  };

  const handleDeleteOrphans = async () => {
    if (!orphanData) return;
    const orphans = orphanData.orphans;
    setDeleteOrphansConfirm(false);
    setOrphanDeleteProgress({ active: true, total: orphans.length, deleted: 0, failed: 0 });
    let deleted = 0;
    let failed = 0;
    for (const orphan of orphans) {
      try {
        await deleteObject(orphan.key);
        deleted++;
      } catch {
        failed++;
      }
      setOrphanDeleteProgress({ active: true, total: orphans.length, deleted, failed });
    }
    showToast(`Deleted ${deleted} orphan files${failed > 0 ? ` (${failed} failed)` : ''}`);
    setOrphanData(null);
    setOrphanDeleteProgress(null);
  };

  const navigateToPrefix = (pfx: string) => {
    setSearchPrefix(pfx);
    loadObjects(pfx);
  };

  const navigateUp = () => {
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setSearchPrefix(newPrefix);
    loadObjects(newPrefix);
  };

  const usedPercent = stats ? Math.min((stats.total_size / stats.quota_bytes) * 100, 100) : 0;

  return (
    <Box>
      <PageHeader
        title="Storage Management"
        description="Manage Cloudflare R2 storage, monitor usage, and clean up orphaned files"
      />

      {/* Capacity & Stats Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Bucket Overview</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={statsLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={loadStats}
            disabled={statsLoading}
          >
            {stats ? 'Refresh' : 'Load Stats'}
          </Button>
        </Stack>

        {statsLoading && !stats && <LinearProgress sx={{ mb: 2 }} />}

        {stats && (
          <>
            {/* Capacity gauge */}
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatBytes(stats.total_size)} used of {formatBytes(stats.quota_bytes)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(stats.quota_bytes - stats.total_size)} available
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={usedPercent}
                sx={{
                  height: 12,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    bgcolor: usedPercent > 90 ? 'error.main' : usedPercent > 70 ? 'warning.main' : 'primary.main',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {usedPercent.toFixed(1)}% utilized
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <StorageIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {formatBytes(stats.total_size)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Used</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <FolderIcon sx={{ fontSize: 32, color: 'info.main', mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {stats.total_count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Files</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {Object.entries(stats.breakdown).map(([category, data]) => (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={category}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      {getCategoryIcon(category)}
                      <Typography variant="subtitle2" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                        {category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.count} files
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(data.size)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {!stats && !statsLoading && (
          <Alert severity="info" variant="outlined">
            Click "Load Stats" to scan the R2 bucket and see capacity and usage breakdown.
          </Alert>
        )}
      </Paper>

      {/* Listing Storage Breakdown */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HomeWorkIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Storage by Listing</Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={listingStorageLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={loadListingStorage}
            disabled={listingStorageLoading}
          >
            {listingStorageData.length > 0 ? 'Refresh' : 'Scan'}
          </Button>
        </Stack>

        {listingStorageLoading && <LinearProgress sx={{ mb: 2 }} />}

        {listingStorageData.length > 0 ? (
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Listing</TableCell>
                  <TableCell align="right">Files</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listingStorageData.map((listing) => (
                  <TableRow key={listing.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {listing.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {listing.id.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={listing.file_count} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatBytes(listing.storage_size)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Browse files">
                          <IconButton
                            size="small"
                            onClick={() => navigateToPrefix(`listings/${listing.id}/`)}
                          >
                            <FolderIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete all listing files">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteListingTarget(listing)}
                          >
                            <DeleteSweepIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : !listingStorageLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Click "Scan" to see storage usage per listing.
          </Typography>
        ) : null}
      </Paper>

      {/* Orphan Detection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FindInPageIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6">Orphan Detection</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {orphanData && orphanData.orphan_count > 0 && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleteOrphansConfirm(true)}
                disabled={!!orphanDeleteProgress}
              >
                Delete {orphanData.orphan_count} Orphans
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={orphansLoading ? <CircularProgress size={16} /> : <SearchIcon />}
              onClick={loadOrphans}
              disabled={orphansLoading || !!orphanDeleteProgress}
            >
              {orphanData ? 'Re-scan' : 'Scan for Orphans'}
            </Button>
          </Stack>
        </Stack>

        {orphansLoading && <LinearProgress sx={{ mb: 2 }} />}

        {orphanDeleteProgress && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Deleting orphans: {orphanDeleteProgress.deleted + orphanDeleteProgress.failed} of {orphanDeleteProgress.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {orphanDeleteProgress.deleted} deleted{orphanDeleteProgress.failed > 0 ? `, ${orphanDeleteProgress.failed} failed` : ''}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={((orphanDeleteProgress.deleted + orphanDeleteProgress.failed) / orphanDeleteProgress.total) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  bgcolor: orphanDeleteProgress.failed > 0 ? 'warning.main' : 'success.main',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(((orphanDeleteProgress.deleted + orphanDeleteProgress.failed) / orphanDeleteProgress.total) * 100)}% complete
            </Typography>
          </Box>
        )}

        {orphanData && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{orphanData.total_r2_files}</Typography>
                    <Typography variant="caption" color="text.secondary">R2 Files</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{orphanData.total_db_keys}</Typography>
                    <Typography variant="caption" color="text.secondary">DB References</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined" sx={{ borderColor: orphanData.orphan_count > 0 ? 'warning.main' : 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: orphanData.orphan_count > 0 ? 'warning.main' : 'text.primary' }}>
                      {orphanData.orphan_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Orphaned Files</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined" sx={{ borderColor: orphanData.orphan_size > 0 ? 'warning.main' : 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: orphanData.orphan_size > 0 ? 'warning.main' : 'text.primary' }}>
                      {formatBytes(orphanData.orphan_size)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Wasted Space</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {orphanData.orphan_count === 0 ? (
              <Alert severity="success" variant="outlined">
                No orphaned files detected. All R2 files have matching database records.
              </Alert>
            ) : (
              <>
                <Alert severity="warning" variant="outlined" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                  Found {orphanData.orphan_count} files in R2 with no matching database record.
                  These are likely remnants from deleted listings.
                </Alert>
                <TableContainer sx={{ maxHeight: 240 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell align="right">Size</TableCell>
                        <TableCell>Last Modified</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orphanData.orphans.slice(0, 50).map((obj) => (
                        <TableRow key={obj.key} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} noWrap>
                              {obj.key}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">{formatBytes(obj.size)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(obj.last_modified)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {orphanData.orphan_count > 50 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Showing first 50 of {orphanData.orphan_count} orphaned files.
                  </Typography>
                )}
              </>
            )}
          </>
        )}

        {!orphanData && !orphansLoading && (
          <Alert severity="info" variant="outlined">
            Scan compares R2 files against database records to find orphaned files that are wasting storage.
          </Alert>
        )}
      </Paper>

      {/* Multipart Uploads Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Multipart Uploads</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<CleaningServicesIcon />}
              onClick={() => setAbortAllConfirm(true)}
              disabled={uploadsLoading || uploads.length === 0}
            >
              Abort All Stale
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={uploadsLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={loadUploads}
              disabled={uploadsLoading}
            >
              {uploads.length > 0 || uploadsLoading ? 'Refresh' : 'Load'}
            </Button>
          </Stack>
        </Stack>

        {uploadsLoading && <LinearProgress sx={{ mb: 2 }} />}

        {uploads.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Initiated</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploads.map((upload) => {
                  const ageMs = Date.now() - new Date(upload.initiated).getTime();
                  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                  const ageMins = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
                  return (
                    <TableRow key={upload.uploadId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} noWrap>
                          {upload.key}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(upload.initiated)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${ageHours}h ${ageMins}m`}
                          size="small"
                          color={ageHours >= 1 ? 'error' : 'warning'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Abort upload">
                          <IconButton size="small" color="error" onClick={() => setAbortTarget(upload)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : !uploadsLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No multipart uploads found. Click "Load" to check.
          </Typography>
        ) : null}
      </Paper>

      {/* File Browser Section */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">File Browser</Typography>
          {prefix && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setDeleteTarget({ key: prefix, type: 'prefix' })}
            >
              Delete All in Prefix
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {prefix && (
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={navigateUp}>
              Up
            </Button>
          )}
          <TextField
            size="small"
            placeholder="Enter prefix (e.g. listings/abc123/)"
            value={searchPrefix}
            onChange={(e) => setSearchPrefix(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadObjects(searchPrefix); }}
            sx={{ flex: 1 }}
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
          <Button
            variant="contained"
            size="small"
            onClick={() => loadObjects(searchPrefix)}
            disabled={objectsLoading}
          >
            Browse
          </Button>
        </Stack>

        {prefix && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
            <Chip label="/" size="small" onClick={() => navigateToPrefix('')} clickable />
            {prefix.split('/').filter(Boolean).map((part, idx, arr) => (
              <Chip
                key={idx}
                label={part}
                size="small"
                onClick={() => navigateToPrefix(arr.slice(0, idx + 1).join('/') + '/')}
                clickable
                color={idx === arr.length - 1 ? 'primary' : 'default'}
                variant={idx === arr.length - 1 ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        )}

        <Divider sx={{ mb: 2 }} />

        {objectsLoading && <LinearProgress sx={{ mb: 2 }} />}

        {objects.length > 0 ? (
          <>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell>Last Modified</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {objects.map((obj) => (
                    <TableRow key={obj.key} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 400 }}
                          noWrap
                        >
                          {obj.key.replace(prefix, '')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">{formatBytes(obj.size)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(obj.last_modified)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete file">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget({ key: obj.key, type: 'object' })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {objects.length} files shown
              </Typography>
              {nextToken && (
                <Button size="small" onClick={() => loadObjects(prefix, nextToken)} disabled={objectsLoading}>
                  Load More
                </Button>
              )}
            </Stack>
          </>
        ) : !objectsLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Enter a prefix and click "Browse" to explore files, or leave empty to list all.
          </Typography>
        ) : null}
      </Paper>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'prefix' ? 'Delete All Files in Prefix' : 'Delete File'}
        message={
          deleteTarget?.type === 'prefix'
            ? `This will permanently delete ALL files under "${deleteTarget.key}". This cannot be undone.`
            : `Permanently delete "${deleteTarget?.key}"? This cannot be undone.`
        }
        confirmLabel={deleteTarget?.type === 'prefix' ? 'Delete All' : 'Delete'}
        confirmColor="error"
        onConfirm={handleDeleteObject}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!abortTarget}
        title="Abort Multipart Upload"
        message={`Abort the multipart upload for "${abortTarget?.key}"? This will free up space occupied by uploaded parts.`}
        confirmLabel="Abort"
        confirmColor="error"
        onConfirm={handleAbortUpload}
        onCancel={() => setAbortTarget(null)}
      />

      <ConfirmDialog
        open={abortAllConfirm}
        title="Abort All Stale Multipart Uploads"
        message="This will abort all multipart uploads older than 1 hour across the entire bucket. This frees space from incomplete uploads."
        confirmLabel="Abort All Stale"
        confirmColor="error"
        onConfirm={handleAbortAllStale}
        onCancel={() => setAbortAllConfirm(false)}
      />

      <ConfirmDialog
        open={!!deleteListingTarget}
        title="Delete All Listing Storage"
        message={`This will permanently delete ALL R2 files for "${deleteListingTarget?.title}" (${deleteListingTarget ? formatBytes(deleteListingTarget.storage_size) : ''}, ${deleteListingTarget?.file_count} files) including its zip. This cannot be undone.`}
        confirmLabel="Delete All Files"
        confirmColor="error"
        onConfirm={handleDeleteListingStorage}
        onCancel={() => setDeleteListingTarget(null)}
      />

      <ConfirmDialog
        open={deleteOrphansConfirm}
        title="Delete All Orphaned Files"
        message={`This will permanently delete ${orphanData?.orphan_count} orphaned files (${orphanData ? formatBytes(orphanData.orphan_size) : ''}) that have no database reference. This cannot be undone.`}
        confirmLabel="Delete Orphans"
        confirmColor="error"
        onConfirm={handleDeleteOrphans}
        onCancel={() => setDeleteOrphansConfirm(false)}
      />

      {actionLoading && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 'snackbar' }}>
          <CircularProgress size={32} />
        </Box>
      )}
    </Box>
  );
}
