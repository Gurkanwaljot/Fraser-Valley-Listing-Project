import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import TimerIcon from '@mui/icons-material/Timer';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PublicIcon from '@mui/icons-material/Public';
import PageHeader from '../../components/common/PageHeader';
import { useListing } from '../../hooks/useListings';
import { useListingDownloads, useDownloadSummary } from '../../hooks/useListingDownloads';
import { formatStreetAddress } from '../../services/marketingService';
import { useListingAnalytics } from '../../hooks/useAnalytics';
import {
  getEngagementMetrics,
  getScrollDepthDistribution,
  getTopPhotos,
  getGeographicBreakdown,
  type EngagementMetrics,
  type ScrollDepthData,
  type TopPhotoEntry,
  type GeoBreakdownEntry,
} from '../../services/analyticsService';
import type { DownloadLogEntry } from '../../hooks/useListingDownloads';
import type { DateRange } from '../../services/analyticsService';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />;
    case 'failed':
      return <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />;
    case 'partial':
      return <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />;
    default:
      return <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />;
  }
}

function StatusChipLocal({ status }: { status: string }) {
  const colorMap: Record<string, 'success' | 'error' | 'warning'> = {
    success: 'success',
    failed: 'error',
    partial: 'warning',
  };
  return (
    <Chip
      icon={<StatusIcon status={status} />}
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      size="small"
      variant="outlined"
      color={colorMap[status] || 'default'}
      sx={{ borderRadius: 1 }}
    />
  );
}

export default function ListingActivityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: listing, isLoading: listingLoading } = useListing(id);
  const { data: downloads, isLoading: downloadsLoading } = useListingDownloads(id);
  const summary = useDownloadSummary(downloads);

  const [analyticsRange, setAnalyticsRange] = useState<DateRange>('30d');
  const { data: analytics, isLoading: analyticsLoading } = useListingAnalytics(id ?? '', analyticsRange);

  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [scrollDepth, setScrollDepth] = useState<ScrollDepthData[] | null>(null);
  const [topPhotos, setTopPhotos] = useState<TopPhotoEntry[] | null>(null);
  const [geo, setGeo] = useState<{ countries: GeoBreakdownEntry[]; cities: GeoBreakdownEntry[] } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getEngagementMetrics(id, analyticsRange),
      getScrollDepthDistribution(id, analyticsRange),
      getTopPhotos(id, analyticsRange),
      getGeographicBreakdown(id, analyticsRange),
    ]).then(([e, s, t, g]) => {
      setEngagement(e);
      setScrollDepth(s);
      setTopPhotos(t);
      setGeo(g);
    });
  }, [id, analyticsRange]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [realtorFilter, setRealtorFilter] = useState<string>('all');

  const uniqueRealtors = useMemo(() => {
    if (!downloads) return [];
    const seen = new Map<string, string>();
    for (const d of downloads) {
      if (d.realtor_id && d.realtor_name && !seen.has(d.realtor_id)) {
        seen.set(d.realtor_id, d.realtor_name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [downloads]);

  const filteredDownloads = useMemo(() => {
    if (!downloads) return [];
    return downloads.filter((d: DownloadLogEntry) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (realtorFilter !== 'all' && d.realtor_id !== realtorFilter) return false;
      return true;
    });
  }, [downloads, statusFilter, realtorFilter]);

  const isLoading = listingLoading || downloadsLoading;

  if (isLoading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="50%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)}
        </Paper>
      </Box>
    );
  }

  if (!listing) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
        <Paper sx={{ p: 6, mt: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">Listing not found</Typography>
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
        title="Analytics & Activity"
        description={`${formatStreetAddress(listing)}, ${listing.city}`}
      />

      {/* Analytics Overview */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'surface.main' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ mb: 2.5 }}
        >
          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
            Performance Overview
          </Typography>
          <ToggleButtonGroup
            value={analyticsRange}
            exclusive
            onChange={(_, val) => { if (val) setAnalyticsRange(val); }}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.25, py: 0.25, fontSize: '0.75rem' } }}
          >
            <ToggleButton value="7d">7d</ToggleButton>
            <ToggleButton value="30d">30d</ToggleButton>
            <ToggleButton value="90d">90d</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {analyticsLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} />)}
          </Box>
        ) : analytics ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <VisibilityIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {analytics.metrics.totalViews.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Views</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PeopleIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {analytics.uniqueSessions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Unique Visitors</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <DownloadIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {analytics.metrics.totalDownloads.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Downloads</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {analytics.metrics.totalLeads.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Leads</Typography>
                </Box>
              </Stack>
            </Box>

            {(analytics.viewsOverTime.length > 0 || analytics.referrers.length > 0) && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
                {analytics.viewsOverTime.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                      Views trend (last {analytics.viewsOverTime.length} days)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 64 }}>
                      {analytics.viewsOverTime.map((d) => {
                        const max = Math.max(...analytics.viewsOverTime.map((x) => x.count), 1);
                        return (
                          <Tooltip key={d.date} title={`${d.date}: ${d.count} views`} arrow>
                            <Box
                              sx={{
                                flex: 1,
                                height: `${(d.count / max) * 100}%`,
                                minHeight: 2,
                                bgcolor: 'primary.main',
                                borderRadius: '2px 2px 0 0',
                                opacity: 0.8,
                                transition: 'opacity 150ms',
                                '&:hover': { opacity: 1 },
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Box>
                )}
                {analytics.referrers.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                      Top referrers
                    </Typography>
                    <Stack spacing={0.75}>
                      {analytics.referrers.slice(0, 5).map((r) => (
                        <Stack key={r.referrer} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" noWrap sx={{ maxWidth: 220, color: 'text.primary' }}>
                            {r.referrer}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{r.count}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No analytics data yet.</Typography>
        )}
      </Paper>

      {/* Engagement Metrics */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'surface.main' }}>
        <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 2 }}>
          Engagement Insights
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TimerIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {engagement?.avgPageDuration != null ? `${engagement.avgPageDuration}s` : '--'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg. Time on Page</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VerticalAlignBottomIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {engagement?.avgScrollDepth != null ? `${engagement.avgScrollDepth}%` : '--'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg. Scroll Depth</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PhotoLibraryIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {engagement?.galleryEngagementRate != null ? `${engagement.galleryEngagementRate}%` : '--'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Gallery Engagement</Typography>
            </Box>
          </Stack>
        </Box>

        {scrollDepth && scrollDepth.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
              Scroll Depth Funnel (% of sessions reaching milestone)
            </Typography>
            <Stack spacing={1}>
              {scrollDepth.map((d) => (
                <Stack key={d.depth} direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="caption" sx={{ width: 36, color: 'text.secondary' }}>{d.depth}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={d.sessions}
                    sx={{ flex: 1, height: 8, borderRadius: 1, bgcolor: 'action.hover' }}
                  />
                  <Typography variant="caption" sx={{ width: 36, textAlign: 'right', color: 'text.secondary' }}>
                    {d.sessions}%
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {((topPhotos && topPhotos.length > 0) || (geo && (geo.countries.length > 0 || geo.cities.length > 0))) && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {topPhotos && topPhotos.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                  Most Viewed Photos
                </Typography>
                <Stack spacing={0.75}>
                  {topPhotos.map((p, idx) => (
                    <Stack key={p.asset_id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        Photo #{idx + 1}
                      </Typography>
                      <Chip label={`${p.count} views`} size="small" variant="outlined" />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            {geo && (geo.countries.length > 0 || geo.cities.length > 0) && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                  <PublicIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Geographic Breakdown
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {geo.countries.map((c) => (
                    <Stack key={c.location} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>{c.location}</Typography>
                      <Chip label={c.count} size="small" variant="outlined" />
                    </Stack>
                  ))}
                  {geo.cities.slice(0, 3).map((c) => (
                    <Stack key={c.location} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.location}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.count}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Download Activity
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <Paper sx={{ p: 2.5, bgcolor: 'surface.main' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DownloadIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>{summary.totalDownloads}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Downloads</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5, bgcolor: 'surface.main' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InsertDriveFileIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>{summary.totalFiles}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Files Downloaded</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5, bgcolor: 'surface.main' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PeopleIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>{summary.uniqueRealtors}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Unique Realtors</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5, bgcolor: 'surface.main' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ScheduleIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {summary.lastDownload ? formatDate(summary.lastDownload) : 'Never'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Last Activity</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Status breakdown */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label={`${summary.successCount} Success`}
          size="small"
          variant="outlined"
          color="success"
        />
        {summary.failedCount > 0 && (
          <Chip
            icon={<ErrorIcon />}
            label={`${summary.failedCount} Failed`}
            size="small"
            variant="outlined"
            color="error"
          />
        )}
        {summary.partialCount > 0 && (
          <Chip
            icon={<WarningIcon />}
            label={`${summary.partialCount} Partial`}
            size="small"
            variant="outlined"
            color="warning"
          />
        )}
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'surface.main' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="partial">Partial</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Realtor"
            value={realtorFilter}
            onChange={(e) => setRealtorFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All Realtors</MenuItem>
            {uniqueRealtors.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Downloads Table */}
      <Paper sx={{ bgcolor: 'surface.main', overflow: 'hidden' }}>
        {filteredDownloads.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {downloads?.length === 0 ? 'No download activity yet for this listing.' : 'No results match the current filters.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Realtor</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }} align="right">Files</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }} align="right">Size</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDownloads.map((dl) => (
                  <TableRow key={dl.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {dl.realtor_name || 'Unknown'}
                      </Typography>
                      {dl.realtor_email && (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {dl.realtor_email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={dl.download_type === 'bulk_zip' ? 'ZIP' : 'Single'}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {dl.file_count ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {dl.total_size_bytes ? formatBytes(dl.total_size_bytes) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {dl.failure_reason ? (
                        <Tooltip title={dl.failure_reason} arrow>
                          <span><StatusChipLocal status={dl.status} /></span>
                        </Tooltip>
                      ) : (
                        <StatusChipLocal status={dl.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {formatDate(dl.created_at)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {formatTime(dl.created_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Divider sx={{ my: 3, borderColor: 'divider' }} />
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center' }}>
        Showing {filteredDownloads.length} of {downloads?.length || 0} download events
      </Typography>
    </Box>
  );
}
