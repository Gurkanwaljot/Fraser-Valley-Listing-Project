import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Skeleton from '@mui/material/Skeleton';
import AvatarGroup from '@mui/material/AvatarGroup';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/listings/StatusChip';
import { useListings } from '../../hooks/useListings';
import { useHeroMediaBatch } from '../../hooks/useMedia';
import type { ListingStatus } from '../../types/database';
import { formatStreetAddress } from '../../services/marketingService';

export default function ListingsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const { data: listings, isLoading } = useListings(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const listingIds = listings?.map((l) => l.id) ?? [];
  const { data: heroImages = {} } = useHeroMediaBatch(listingIds);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  };

  return (
    <Box>
      <PageHeader
        title="Listings"
        description="Manage your property listings"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/listings/new')}
          >
            New Listing
          </Button>
        }
      />

      <Box sx={{ mb: 3, overflowX: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, val) => { if (val !== null) setStatusFilter(val); }}
          size="small"
          sx={{ flexWrap: 'nowrap' }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="draft">Draft</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="sold">Sold</ToggleButton>
          <ToggleButton value="archived">Archived</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <ListingsLoading isMobile={isMobile} />
      ) : !listings?.length ? (
        <EmptyState
          icon={<HomeWorkIcon />}
          title="No listings yet"
          description={statusFilter !== 'all'
            ? `No ${statusFilter} listings found. Try a different filter.`
            : 'Create your first property listing to get started.'}
          action={
            statusFilter === 'all' ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/dashboard/listings/new')}>
                Create Listing
              </Button>
            ) : undefined
          }
        />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {listings.map((listing) => (
            <Card key={listing.id} sx={{ bgcolor: 'background.paper' }}>
              <CardActionArea onClick={() => navigate(`/dashboard/listings/${listing.id}`)}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    {heroImages[listing.id] ? (
                      <Box
                        component="img"
                        src={heroImages[listing.id]}
                        alt=""
                        sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <Box sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HomeWorkIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{formatStreetAddress(listing)}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {listing.city}, {listing.province_state}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                        <StatusChip status={listing.status} />
                        <Typography variant="caption" color="text.secondary">
                          {formatPrice(listing.price, listing.currency)}
                        </Typography>
                      </Stack>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(`/listing/${listing.slug}`, '_blank');
                      }}
                      sx={{ color: 'text.secondary', flexShrink: 0 }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  {listing.realtors.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, ml: '68px' }}>
                      {listing.realtors.slice(0, 3).map((r) => (
                        <Chip key={r.id} label={r.full_name} size="small" variant="outlined" sx={{ fontSize: '0.6875rem', height: 22 }} />
                      ))}
                      {listing.realtors.length > 3 && (
                        <Chip label={`+${listing.realtors.length - 3}`} size="small" variant="outlined" sx={{ fontSize: '0.6875rem', height: 22 }} />
                      )}
                    </Stack>
                  )}
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
                  <TableCell sx={{ width: 68, p: 1 }} />
                  <TableCell>Property</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Realtors</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow
                    key={listing.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/listings/${listing.id}`)}
                  >
                    <TableCell sx={{ width: 68, p: 1 }}>
                      {heroImages[listing.id] ? (
                        <Box
                          component="img"
                          src={heroImages[listing.id]}
                          alt=""
                          sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HomeWorkIcon sx={{ fontSize: 22, color: 'text.disabled' }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" noWrap>{formatStreetAddress(listing)}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {listing.city}, {listing.province_state} {listing.postal_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={listing.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatPrice(listing.price, listing.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {listing.realtors.length > 0 ? (
                        <AvatarGroup max={3} sx={{ justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
                          {listing.realtors.map((r) => (
                            <Tooltip key={r.id} title={`${r.full_name}${r.is_primary ? ' (Primary)' : ''}`}>
                              <Avatar sx={{ bgcolor: r.is_primary ? 'primary.main' : 'grey.700' }}>
                                {r.full_name.charAt(0)}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                      ) : (
                        <Typography variant="caption" color="text.disabled">None</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(listing.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Preview public page">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/listing/${listing.slug}`, '_blank');
                          }}
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

function ListingsLoading({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {[1, 2, 3, 4].map((i) => (
          <Paper key={i} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5}>
              <Skeleton variant="rounded" width={56} height={56} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="70%" height={20} />
                <Skeleton width="50%" height={16} sx={{ mt: 0.5 }} />
                <Skeleton width="30%" height={24} sx={{ mt: 0.5 }} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 68, p: 1 }} />
              <TableCell>Property</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Realtors</TableCell>
              <TableCell>Created</TableCell>
              <TableCell sx={{ width: 56 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell sx={{ width: 68, p: 1 }}><Skeleton variant="rounded" width={48} height={48} /></TableCell>
                <TableCell><Skeleton width="70%" /></TableCell>
                <TableCell><Skeleton width={60} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={40} /></TableCell>
                <TableCell><Skeleton width={80} /></TableCell>
                <TableCell><Skeleton width={32} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
