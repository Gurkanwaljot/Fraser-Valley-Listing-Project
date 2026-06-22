import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardMetrics } from '../../hooks/useListings';
import OnboardingDialog from '../../components/common/OnboardingDialog';

function MetricCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      {loading ? (
        <Skeleton width={60} height={36} />
      ) : (
        <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 400 }}>
          {value.toLocaleString()}
        </Typography>
      )}
    </Paper>
  );
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const [showOnboarding, setShowOnboarding] = useState(() => !profile?.onboarding_completed_at);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 400 }}>
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Here is an overview of your listings and activity.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard label="Active Listings" value={metrics?.activeListings ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard label="Total Views" value={metrics?.totalViews ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard label="Downloads" value={metrics?.totalDownloads ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard label="Realtors" value={metrics?.totalRealtors ?? 0} loading={isLoading} />
        </Grid>
      </Grid>

      {!isLoading && metrics?.activeListings === 0 && (
        <Paper sx={{ mt: 4, p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 400 }} color="text.secondary">
            No listings yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1, mb: 3 }}>
            Create your first listing to start showcasing properties.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/listings/new')}
          >
            Create Listing
          </Button>
        </Paper>
      )}

      {user && (
        <OnboardingDialog
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={user.id}
        />
      )}
    </Box>
  );
}
