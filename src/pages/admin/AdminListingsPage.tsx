import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/listings/StatusChip';
import { getAllListingsAdmin } from '../../services/adminService';
import type { ListingStatus } from '../../types/database';
import { formatStreetAddress } from '../../services/marketingService';

export default function AdminListingsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [listings, setListings] = useState<Awaited<ReturnType<typeof getAllListingsAdmin>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');

  const loadListings = useCallback(async () => {
    setLoading(true);
    const data = await getAllListingsAdmin();
    setListings(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  const filteredListings = statusFilter === 'all'
    ? listings
    : listings.filter((l) => l.status === statusFilter);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Box>
      <PageHeader title="All Listings" description="View all listings across all photographers" />

      <Box sx={{ mb: 3, overflowX: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, val) => { if (val !== null) setStatusFilter(val); }}
          size="small"
        >
          <ToggleButton value="all">All ({listings.length})</ToggleButton>
          <ToggleButton value="draft">Draft</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="sold">Sold</ToggleButton>
          <ToggleButton value="archived">Archived</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Stack spacing={isMobile ? 1.5 : 0.5}>
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height={isMobile ? 80 : 52} />)}
        </Stack>
      ) : filteredListings.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {statusFilter === 'all' ? 'No listings in the system' : `No ${statusFilter} listings found`}
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {filteredListings.map((listing) => (
            <Card key={listing.id} sx={{ bgcolor: 'background.paper' }}>
              <CardActionArea onClick={() => navigate(`/dashboard/listings/${listing.id}`)}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{formatStreetAddress(listing)}, {listing.city}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        by {listing.photographer_name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                        <StatusChip status={listing.status as ListingStatus} />
                        <Typography variant="caption" color="text.disabled">{formatDate(listing.created_at)}</Typography>
                      </Stack>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(`/listing/${listing.slug}`, '_blank'); }}
                      sx={{ color: 'text.secondary', flexShrink: 0 }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>Photographer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow
                    key={listing.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/listings/${listing.id}`)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" noWrap>{formatStreetAddress(listing)}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {listing.city}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{listing.photographer_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={listing.status as ListingStatus} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{formatDate(listing.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Preview public page">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); window.open(`/listing/${listing.slug}`, '_blank'); }}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
