import { useState, useEffect } from 'react';
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
import Chip from '@mui/material/Chip';
import PeopleIcon from '@mui/icons-material/People';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonIcon from '@mui/icons-material/Person';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PublicIcon from '@mui/icons-material/Public';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ErrorIcon from '@mui/icons-material/Error';
import EmailIcon from '@mui/icons-material/Email';
import EventIcon from '@mui/icons-material/Event';
import PageHeader from '../../components/common/PageHeader';
import {
  getPlatformKPIs,
  getEventsPerDay,
  getPhotographerLeaderboard,
  getGeographicDistribution,
  getSystemHealth,
  type PlatformKPIs,
  type DailyEventCount,
  type PhotographerLeaderEntry,
  type GeoEntry,
  type SystemHealth,
} from '../../services/adminAnalyticsService';
import {
  getMarketingUsageReport,
  type MarketingUsageReport,
} from '../../services/marketingAnalyticsService';

function GrowthIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return null;
  const positive = change > 0;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      {positive ? (
        <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
      )}
      <Typography variant="caption" sx={{ color: positive ? 'success.main' : 'error.main' }}>
        {positive ? '+' : ''}{change}%
      </Typography>
    </Stack>
  );
}

function KPICard({ title, value, icon, current, previous }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  current: number;
  previous: number;
}) {
  return (
    <Paper sx={{ p: 2.5, flex: 1, minWidth: 180 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 600 }}>{value}</Typography>
          <GrowthIndicator current={current} previous={previous} />
        </Box>
        <Box sx={{ color: 'primary.main', opacity: 0.7 }}>{icon}</Box>
      </Stack>
    </Paper>
  );
}

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [eventsPerDay, setEventsPerDay] = useState<DailyEventCount[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<PhotographerLeaderEntry[] | null>(null);
  const [geo, setGeo] = useState<{ countries: GeoEntry[]; cities: GeoEntry[] } | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [marketingUsage, setMarketingUsage] = useState<MarketingUsageReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPlatformKPIs(),
      getEventsPerDay(),
      getPhotographerLeaderboard(),
      getGeographicDistribution(),
      getSystemHealth(),
      getMarketingUsageReport(),
    ]).then(([k, e, l, g, h, m]) => {
      setKpis(k);
      setEventsPerDay(e);
      setLeaderboard(l);
      setGeo(g);
      setHealth(h);
      setMarketingUsage(m);
      setLoading(false);
    });
  }, []);

  const maxEventsInDay = eventsPerDay ? Math.max(...eventsPerDay.map((d) => d.count), 1) : 1;

  return (
    <Box>
      <PageHeader title="Platform Analytics" description="Company-wide metrics and system health" />

      {loading ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ flex: 1, minWidth: 180 }} />)}
          </Stack>
          <Skeleton variant="rounded" height={300} />
        </Stack>
      ) : (
        <Stack spacing={3}>
          {/* Platform KPIs */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
            <KPICard
              title="Photographers"
              value={kpis!.totalPhotographers}
              icon={<PeopleIcon />}
              current={kpis!.totalPhotographers}
              previous={kpis!.prevPhotographers}
            />
            <KPICard
              title="Active Listings"
              value={kpis!.activeListings}
              icon={<HomeWorkIcon />}
              current={kpis!.activeListings}
              previous={kpis!.prevListings}
            />
            <KPICard
              title="Realtors"
              value={kpis!.totalRealtors}
              icon={<PersonIcon />}
              current={kpis!.totalRealtors}
              previous={kpis!.prevRealtors}
            />
            <KPICard
              title="Total Leads"
              value={kpis!.totalLeads}
              icon={<LeaderboardIcon />}
              current={kpis!.totalLeads}
              previous={kpis!.prevLeads}
            />
          </Stack>

          {/* Events Per Day */}
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <EventIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>Events Per Day (Last 30 Days)</Typography>
            </Stack>
            {eventsPerDay && eventsPerDay.length > 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 120 }}>
                {eventsPerDay.map((day) => (
                  <Box
                    key={day.date}
                    sx={{
                      flex: 1,
                      minWidth: 4,
                      height: `${(day.count / maxEventsInDay) * 100}%`,
                      bgcolor: 'primary.main',
                      borderRadius: '2px 2px 0 0',
                      opacity: 0.85,
                      transition: 'opacity 0.2s',
                      '&:hover': { opacity: 1 },
                    }}
                    title={`${day.date}: ${day.count} events`}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No event data yet</Typography>
            )}
          </Paper>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Photographer Leaderboard */}
            <Paper sx={{ p: 2.5, flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <LeaderboardIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>Photographer Leaderboard</Typography>
              </Stack>
              {leaderboard && leaderboard.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Listings</TableCell>
                        <TableCell align="right">Views</TableCell>
                        <TableCell align="right">Downloads</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow key={entry.user_id}>
                          <TableCell>{entry.name}</TableCell>
                          <TableCell align="right">{entry.active_listings}</TableCell>
                          <TableCell align="right">{entry.views}</TableCell>
                          <TableCell align="right">{entry.downloads}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">No photographer data</Typography>
              )}
            </Paper>

            {/* Geographic Distribution */}
            <Paper sx={{ p: 2.5, flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PublicIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>Geographic Distribution</Typography>
              </Stack>
              {geo && (geo.countries.length > 0 || geo.cities.length > 0) ? (
                <Stack spacing={2}>
                  {geo.countries.length > 0 && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">Countries</Typography>
                      <Stack spacing={0.5}>
                        {geo.countries.map((c) => (
                          <Stack key={c.location} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">{c.location}</Typography>
                            <Chip label={c.count} size="small" variant="outlined" />
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {geo.cities.length > 0 && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">Cities</Typography>
                      <Stack spacing={0.5}>
                        {geo.cities.slice(0, 5).map((c) => (
                          <Stack key={c.location} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">{c.location}</Typography>
                            <Chip label={c.count} size="small" variant="outlined" />
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No geographic data yet (populates as events are tracked via the new Edge Function)</Typography>
              )}
            </Paper>
          </Stack>

          {/* System Health */}
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <HealthAndSafetyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>System Health</Typography>
            </Stack>
            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <ErrorIcon sx={{ fontSize: 16, color: health!.failedDownloads7d > 0 ? 'error.main' : 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Failed Downloads (7d)</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 0.5, color: health!.failedDownloads7d > 0 ? 'error.main' : 'text.primary' }}>
                  {health!.failedDownloads7d}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Pending Invitations</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {health!.pendingInvitations}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Events Today</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {health!.eventsToday}
                </Typography>
                {health!.eventsYesterday > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Yesterday: {health!.eventsYesterday}
                  </Typography>
                )}
              </Paper>
            </Stack>
          </Paper>

          {/* Marketing Tool Usage */}
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LeaderboardIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>Marketing Tool Usage (30 days)</Typography>
            </Stack>
            {marketingUsage && marketingUsage.totals.length > 0 ? (
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                  {marketingUsage.totals.map((t) => {
                    const labels: Record<string, string> = {
                      marketing_kit_open: 'Kit Opens',
                      brochure_open: 'Brochure Views',
                      brochure_export: 'Brochure Exports',
                      social_post_open: 'Social Post Views',
                      social_post_export: 'Social Post Exports',
                      reel_open: 'Reel Views',
                      reel_export: 'Reel Exports',
                      realtor_portal_view: 'Portal Views',
                    };
                    return (
                      <Paper key={t.event_type} variant="outlined" sx={{ p: 2, minWidth: 140 }}>
                        <Typography variant="caption" color="text.secondary">
                          {labels[t.event_type] || t.event_type}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t.count}</Typography>
                      </Paper>
                    );
                  })}
                </Stack>
                {(marketingUsage.topBrochureTemplates.length > 0 || marketingUsage.topSocialTemplates.length > 0) && (
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                    {marketingUsage.topBrochureTemplates.length > 0 && (
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="overline" color="text.secondary">Top Brochure Templates</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {marketingUsage.topBrochureTemplates.map((t) => (
                            <Stack key={t.template} direction="row" justifyContent="space-between">
                              <Typography variant="body2">{t.template}</Typography>
                              <Chip label={t.count} size="small" variant="outlined" />
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {marketingUsage.topSocialTemplates.length > 0 && (
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="overline" color="text.secondary">Top Social Templates</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {marketingUsage.topSocialTemplates.map((t) => (
                            <Stack key={t.template} direction="row" justifyContent="space-between">
                              <Typography variant="body2">{t.template}</Typography>
                              <Chip label={t.count} size="small" variant="outlined" />
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No marketing tool usage yet</Typography>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
