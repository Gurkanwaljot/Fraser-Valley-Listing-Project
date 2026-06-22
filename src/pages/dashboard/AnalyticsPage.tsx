import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PeopleIcon from '@mui/icons-material/People';
import DownloadIcon from '@mui/icons-material/Download';
import PersonIcon from '@mui/icons-material/Person';
import CampaignIcon from '@mui/icons-material/Campaign';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/common/PageHeader';
import {
  useAnalyticsOverview,
  useTopListings,
  useDeviceBreakdown,
  useReferrers,
  useEventBreakdown,
  useConversionFunnel,
  useMetricOverTime,
  useMarketingUsage,
} from '../../hooks/useAnalytics';
import type { DateRange } from '../../services/analyticsService';
import type { TimeSeriesMetric } from '../../services/analyticsService';

const EVENT_LABELS: Record<string, string> = {
  view: 'Page Views',
  photo_open: 'Photo Opens',
  video_play: 'Video Plays',
  asset_download: 'Downloads',
  document_download: 'Doc Downloads',
  lead_submit: 'Leads',
  realtor_contact_click: 'Contact Clicks',
  download_center_open: 'Download Center',
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      <PageHeader title="Analytics" description="Track performance across all your listings" />

      <Box sx={{ mb: 3, overflowX: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
        <ToggleButtonGroup
          value={range}
          exclusive
          onChange={(_, val) => { if (val) setRange(val); }}
          size="small"
        >
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="30d">30 days</ToggleButton>
          <ToggleButton value="90d">90 days</ToggleButton>
          <ToggleButton value="all">All time</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <MetricsCards range={range} isMobile={isMobile} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, mt: 2 }}>
        <ViewsChart range={range} />
        <DeviceChart range={range} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <TopListingsSection range={range} />
        <EventBreakdownSection range={range} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <ConversionFunnelSection range={range} />
        <ReferrersSection range={range} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <MarketingKitSection range={range} />
      </Box>
    </Box>
  );
}

function MetricsCards({ range, isMobile }: { range: DateRange; isMobile: boolean }) {
  const { data, isLoading } = useAnalyticsOverview(range);

  const metrics = [
    { label: 'Views', value: data?.totalViews ?? 0, icon: <VisibilityIcon /> },
    { label: 'Unique Visitors', value: data?.uniqueVisitors ?? 0, icon: <PeopleIcon /> },
    { label: 'Photo Opens', value: data?.totalPhotoOpens ?? 0, icon: <PhotoCameraIcon /> },
    { label: 'Downloads', value: data?.totalDownloads ?? 0, icon: <DownloadIcon /> },
    { label: 'Leads', value: data?.totalLeads ?? 0, icon: <PersonIcon /> },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: { xs: 1, sm: 2 } }}>
      {metrics.map((m) => (
        <Paper key={m.label} sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: isMobile ? 18 : 20 } }}>{m.icon}</Box>
            <Typography variant="caption" color="text.secondary">{m.label}</Typography>
          </Stack>
          {isLoading ? (
            <Skeleton width={60} height={32} />
          ) : (
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 500 }}>
              {m.value.toLocaleString()}
            </Typography>
          )}
        </Paper>
      ))}
    </Box>
  );
}

function ViewsChart({ range }: { range: DateRange }) {
  const [metric, setMetric] = useState<TimeSeriesMetric>('views');
  const { data: chartData, isLoading } = useMetricOverTime(range, metric);

  const maxCount = Math.max(...(chartData ?? []).map((d) => d.count), 1);
  const metricLabels: Record<TimeSeriesMetric, string> = { views: 'Views', leads: 'Leads', downloads: 'Downloads' };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>{metricLabels[metric]} Over Time</Typography>
        <ToggleButtonGroup
          value={metric}
          exclusive
          onChange={(_, val) => { if (val) setMetric(val); }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25, fontSize: '0.7rem' } }}
        >
          <ToggleButton value="views">Views</ToggleButton>
          <ToggleButton value="leads">Leads</ToggleButton>
          <ToggleButton value="downloads">Downloads</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {isLoading ? (
        <Box sx={{ height: 200 }}>
          <Skeleton variant="rectangular" height={200} />
        </Box>
      ) : !chartData || chartData.length === 0 ? (
        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">No {metric} data yet</Typography>
        </Box>
      ) : (
        <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px', overflow: 'hidden' }}>
          {chartData.map((d) => (
            <Box
              key={d.date}
              sx={{
                flex: 1,
                minWidth: 4,
                maxWidth: 24,
                height: `${(d.count / maxCount) * 100}%`,
                minHeight: 2,
                bgcolor: 'primary.main',
                borderRadius: '2px 2px 0 0',
                opacity: 0.85,
                transition: (t) => t.transitions.create('opacity'),
                '&:hover': { opacity: 1 },
              }}
              title={`${d.date}: ${d.count} ${metric}`}
            />
          ))}
        </Box>
      )}
      {chartData && chartData.length > 0 && (
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {chartData[0].date}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {chartData[chartData.length - 1].date}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}

function DeviceChart({ range }: { range: DateRange }) {
  const { data: devices, isLoading } = useDeviceBreakdown(range);
  const total = (devices ?? []).reduce((sum, d) => sum + d.count, 0) || 1;

  const deviceColors: Record<string, string> = {
    desktop: '#C8A45D',
    mobile: '#6B9FD4',
    tablet: '#22C55E',
    unknown: '#A8A29E',
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>Devices</Typography>
      {isLoading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : !devices || devices.length === 0 ? (
        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">No data yet</Typography>
        </Box>
      ) : (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {devices.map((d) => {
            const pct = Math.round((d.count / total) * 100);
            return (
              <Box key={d.device_type}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {d.device_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pct}% ({d.count.toLocaleString()})
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: deviceColors[d.device_type] || deviceColors.unknown,
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function TopListingsSection({ range }: { range: DateRange }) {
  const { data: listings, isLoading } = useTopListings(range);
  const navigate = useNavigate();
  const maxCount = listings?.[0]?.count ?? 1;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>Top Listings</Typography>
      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={36} />)}
        </Stack>
      ) : !listings || listings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No view data yet</Typography>
      ) : (
        <Stack spacing={1.5}>
          {listings.map((l, idx) => (
            <Box
              key={l.listing_id}
              onClick={() => navigate(`/dashboard/listings/${l.listing_id}`)}
              sx={{ cursor: 'pointer', '&:hover .listing-bar': { opacity: 1 } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {idx + 1}.
                  </Typography>
                  {l.address || l.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {l.count.toLocaleString()} views
                </Typography>
              </Stack>
              <LinearProgress
                className="listing-bar"
                variant="determinate"
                value={(l.count / maxCount) * 100}
                sx={{
                  height: 4,
                  borderRadius: 0.5,
                  bgcolor: 'action.hover',
                  opacity: 0.8,
                  transition: (t) => t.transitions.create('opacity'),
                  '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 0.5 },
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function EventBreakdownSection({ range }: { range: DateRange }) {
  const { data: events, isLoading } = useEventBreakdown(range);
  const total = (events ?? []).reduce((sum, e) => sum + e.count, 0) || 1;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>Event Breakdown</Typography>
      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={36} />)}
        </Stack>
      ) : !events || events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No events yet</Typography>
      ) : (
        <Stack spacing={1.5}>
          {events.map((e) => {
            const pct = Math.round((e.count / total) * 100);
            return (
              <Stack key={e.event_type} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">
                  {EVENT_LABELS[e.event_type] || e.event_type}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 48, textAlign: 'right' }}>
                    {e.count.toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function ConversionFunnelSection({ range }: { range: DateRange }) {
  const { data: funnel, isLoading } = useConversionFunnel(range);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>Conversion Funnel</Typography>
      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={36} />)}
        </Stack>
      ) : !funnel || funnel.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No funnel data yet</Typography>
      ) : (
        <Stack spacing={1.5}>
          {funnel.map((step, idx) => (
            <Box key={step.label}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2">{step.label}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">{step.rate}%</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 48, textAlign: 'right' }}>
                    {step.count.toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={step.rate}
                sx={{
                  height: 6,
                  borderRadius: 0.5,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: idx === 0 ? 'primary.main' : idx === funnel.length - 1 ? 'success.main' : 'primary.light',
                    borderRadius: 0.5,
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function ReferrersSection({ range }: { range: DateRange }) {
  const { data: referrers, isLoading } = useReferrers(range);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>Top Referrers</Typography>
      {isLoading ? (
        <Skeleton variant="rectangular" height={120} />
      ) : !referrers || referrers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No referrer data yet</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell align="right">Visits</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {referrers.map((r) => (
                <TableRow key={r.referrer}>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 180, sm: 300, md: 'none' } }}>
                      {r.referrer}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{r.count.toLocaleString()}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

const MARKETING_LABELS: Record<string, string> = {
  marketing_kit_open: 'Kit Opens',
  brochure_open: 'Brochure Views',
  brochure_export: 'Brochure Exports',
  social_post_open: 'Social Post Views',
  social_post_export: 'Social Post Exports',
  reel_open: 'Reel Views',
  reel_export: 'Reel Exports',
  realtor_portal_view: 'Portal Views',
};

function MarketingKitSection({ range }: { range: DateRange }) {
  const { data: report, isLoading } = useMarketingUsage(range);

  const totalEvents = (report?.totals ?? []).reduce((sum, t) => sum + t.count, 0);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <CampaignIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 500 }}>Marketing Kit Usage</Typography>
      </Stack>
      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={36} />)}
        </Stack>
      ) : totalEvents === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No marketing kit activity yet. Realtors will see usage stats here once they start using the marketing tools.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Activity</Typography>
            <Stack spacing={1}>
              {(report?.totals ?? []).map((t) => (
                <Stack key={t.event_type} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">{MARKETING_LABELS[t.event_type] || t.event_type}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.count.toLocaleString()}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Top Brochure Templates</Typography>
            {(report?.topBrochureTemplates ?? []).length === 0 ? (
              <Typography variant="body2" color="text.disabled">No brochure exports yet</Typography>
            ) : (
              <Stack spacing={1}>
                {(report?.topBrochureTemplates ?? []).map((t) => (
                  <Stack key={t.template} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{t.template.replace(/-/g, ' ')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.count}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Top Social Templates</Typography>
            {(report?.topSocialTemplates ?? []).length === 0 ? (
              <Typography variant="body2" color="text.disabled">No social exports yet</Typography>
            ) : (
              <Stack spacing={1}>
                {(report?.topSocialTemplates ?? []).map((t) => (
                  <Stack key={t.template} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{t.template.replace(/-/g, ' ')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.count}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
