import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PageHeader from '../../components/common/PageHeader';
import FeaturePicker from '../../components/listings/FeaturePicker';
import { useListing, useUpdateListing } from '../../hooks/useListings';
import { useFeatureSuggestions } from '../../hooks/useFeatureSuggestions';
import { useToast } from '../../hooks/useToast';
import { useAddressAutocomplete, type AddressComponents } from '../../hooks/useGoogleMaps';

const PROPERTY_TYPES = [
  'Detached', 'Semi-Detached', 'Townhouse', 'Condo', 'Duplex',
  'Triplex', 'Bungalow', 'Estate', 'Vacant Land', 'Commercial', 'Other',
];

const DEFAULT_SECTION_ORDER = [
  'photos', 'video', 'floor_plan', 'interactive_floor_plan', 'details', 'map', 'documents', 'contact',
];

const SECTION_LABELS: Record<string, string> = {
  photos: 'Photos',
  video: 'Video',
  floor_plan: 'Floor Plans',
  interactive_floor_plan: 'Interactive Floor Plan',
  details: 'Details',
  map: 'Map',
  documents: 'Documents',
  contact: 'Contact',
};

interface FormData {
  property_type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province_state: string;
  postal_code: string;
  country: string;
  price: string;
  property_taxes: string;
  bedrooms: string;
  bathrooms: string;
  square_footage: string;
  lot_size: string;
  year_built: string;
  mls_number: string;
  description: string;
  features: string[];
  interactive_floor_plan_embed: string;
  section_order: string[];
  hidden_sections: string[];
}

export default function ListingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: listing, isLoading } = useListing(id);
  const updateListing = useUpdateListing();
  const { syncUsage } = useFeatureSuggestions();
  const [form, setForm] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const addressInputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelected = useCallback((address: AddressComponents) => {
    setForm((prev) => prev ? {
      ...prev,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || prev.address_line_2,
      city: address.city,
      province_state: address.province_state,
      postal_code: address.postal_code,
      country: address.country,
    } : prev);
    setErrors((prev) => ({
      ...prev,
      address_line_1: '',
      city: '',
      province_state: '',
      postal_code: '',
    }));
  }, []);

  useAddressAutocomplete(addressInputRef, handlePlaceSelected);

  useEffect(() => {
    if (listing && !form) {
      setForm({
        property_type: listing.property_type || '',
        address_line_1: listing.address_line_1,
        address_line_2: listing.address_line_2 || '',
        city: listing.city,
        province_state: listing.province_state,
        postal_code: listing.postal_code,
        country: listing.country,
        price: listing.price?.toString() || '',
        property_taxes: listing.property_taxes?.toString() || '',
        bedrooms: listing.bedrooms?.toString() || '',
        bathrooms: listing.bathrooms?.toString() || '',
        square_footage: listing.square_footage?.toString() || '',
        lot_size: listing.lot_size || '',
        year_built: listing.year_built?.toString() || '',
        mls_number: listing.mls_number || '',
        description: listing.description || '',
        features: listing.features || [],
        interactive_floor_plan_embed: listing.interactive_floor_plan_embed || '',
        section_order: listing.section_order || DEFAULT_SECTION_ORDER,
        hidden_sections: listing.hidden_sections || ['documents'],
      });
    }
  }, [listing, form]);

  if (isLoading || !form) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="30%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}><Skeleton height={56} /></Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const addFeature = (feature: string) => {
    if (!form!.features.some((f) => f.toLowerCase() === feature.toLowerCase())) {
      setForm((prev) => prev ? { ...prev, features: [...prev.features, feature] } : prev);
    }
  };

  const removeFeature = (feature: string) => {
    setForm((prev) => prev ? { ...prev, features: prev.features.filter((f) => f !== feature) } : prev);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.address_line_1.trim()) newErrors.address_line_1 = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.province_state.trim()) newErrors.province_state = 'Province/State is required';
    if (!form.postal_code.trim()) newErrors.postal_code = 'Postal code is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const streetLine = form.address_line_2
        ? `${form.address_line_2} - ${form.address_line_1}`
        : form.address_line_1;
      const title = [streetLine, form.city, form.province_state].filter(Boolean).join(', ');
      await updateListing.mutateAsync({
        id: id!,
        data: {
          title: title.trim(),
          property_type: form.property_type || undefined,
          description: form.description.trim() || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          property_taxes: form.property_taxes ? parseFloat(form.property_taxes) : undefined,
          address_line_1: form.address_line_1.trim(),
          address_line_2: form.address_line_2.trim() || undefined,
          city: form.city.trim(),
          province_state: form.province_state.trim(),
          postal_code: form.postal_code.trim(),
          country: form.country.trim(),
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : undefined,
          square_footage: form.square_footage ? parseInt(form.square_footage) : undefined,
          lot_size: form.lot_size.trim() || undefined,
          year_built: form.year_built ? parseInt(form.year_built) : undefined,
          mls_number: form.mls_number.trim() || undefined,
          features: form.features,
          interactive_floor_plan_embed: form.interactive_floor_plan_embed.trim() || null,
          section_order: form.section_order,
          hidden_sections: form.hidden_sections,
        },
      });
      if (form.features.length > 0) syncUsage(form.features);
      showToast('Listing updated');
      navigate(`/dashboard/listings/${id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update listing', 'error');
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/dashboard/listings/${id}`)} sx={{ mb: 2 }}>
        Back to Listing
      </Button>

      <PageHeader title="Edit Listing" description={listing?.slug ? `/listing/${listing.slug}` : undefined} />

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Property Type" select fullWidth value={form.property_type} onChange={handleChange('property_type')}>
                <MenuItem value="">Select type...</MenuItem>
                {PROPERTY_TYPES.map((type) => (<MenuItem key={type} value={type}>{type}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="MLS Number" fullWidth value={form.mls_number} onChange={handleChange('mls_number')} />
            </Grid>

            <Grid size={12}><Divider /><Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>Address</Typography></Grid>
            <Grid size={12}>
              <TextField label="Address Line 1" required fullWidth value={form.address_line_1} onChange={handleChange('address_line_1')} error={!!errors.address_line_1} helperText={errors.address_line_1 || 'Start typing to see address suggestions'} inputRef={addressInputRef} />
            </Grid>
            <Grid size={12}>
              <TextField label="Unit / Suite Number" fullWidth value={form.address_line_2} onChange={handleChange('address_line_2')} placeholder="e.g. 331" helperText="Auto-filled when available from address search" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="City" required fullWidth value={form.city} onChange={handleChange('city')} error={!!errors.city} helperText={errors.city} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Province / State" required fullWidth value={form.province_state} onChange={handleChange('province_state')} error={!!errors.province_state} helperText={errors.province_state} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Postal Code" required fullWidth value={form.postal_code} onChange={handleChange('postal_code')} error={!!errors.postal_code} helperText={errors.postal_code} />
            </Grid>

            <Grid size={12}><Divider /><Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>Details</Typography></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Price" fullWidth type="number" value={form.price} onChange={handleChange('price')} slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Annual property taxes ($)" fullWidth type="number" value={form.property_taxes} onChange={handleChange('property_taxes')} slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Bedrooms" fullWidth type="number" value={form.bedrooms} onChange={handleChange('bedrooms')} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Bathrooms" fullWidth type="number" value={form.bathrooms} onChange={handleChange('bathrooms')} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Living Area (sq. ft.)" fullWidth type="number" value={form.square_footage} onChange={handleChange('square_footage')} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Lot Size (sq. ft.)" fullWidth value={form.lot_size} onChange={handleChange('lot_size')} placeholder="e.g. 5000" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField label="Year Built" fullWidth type="number" value={form.year_built} onChange={handleChange('year_built')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Description" fullWidth multiline rows={4} value={form.description} onChange={handleChange('description')} />
            </Grid>

            <Grid size={12}><Divider /><Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>Features</Typography></Grid>
            <Grid size={12}>
              <FeaturePicker
                selected={form.features}
                onAdd={addFeature}
                onRemove={removeFeature}
              />
            </Grid>

            <Grid size={12}><Divider /><Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>Interactive Floor Plan</Typography></Grid>
            <Grid size={12}>
              <TextField
                label="Interactive Floor Plan Embed"
                fullWidth
                multiline
                rows={3}
                value={form.interactive_floor_plan_embed}
                onChange={handleChange('interactive_floor_plan_embed')}
                placeholder='Paste an iframe embed code or URL (e.g. Matterport, iGuide)'
                helperText="Paste a URL or full iframe embed code from your 3D tour provider"
              />
            </Grid>

            <Grid size={12}><Divider /><Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>Section Order & Visibility</Typography></Grid>
            <Grid size={12}>
              <SectionOrderManager
                order={form.section_order}
                onChange={(newOrder) => setForm((prev) => prev ? { ...prev, section_order: newOrder } : prev)}
                hiddenSections={form.hidden_sections}
                onHiddenChange={(sections) => setForm((prev) => prev ? { ...prev, hidden_sections: sections } : prev)}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button type="submit" variant="contained" disabled={updateListing.isPending}>
              {updateListing.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/dashboard/listings/${id}`)}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

function SectionOrderManager({ order, onChange, hiddenSections, onHiddenChange }: {
  order: string[];
  onChange: (order: string[]) => void;
  hiddenSections: string[];
  onHiddenChange: (sections: string[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    onChange(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const toggleVisibility = (sectionId: string) => {
    if (hiddenSections.includes(sectionId)) {
      onHiddenChange(hiddenSections.filter((s) => s !== sectionId));
    } else {
      onHiddenChange([...hiddenSections, sectionId]);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Drag to reorder, toggle to show/hide sections on the public listing page
        </Typography>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => { onChange(DEFAULT_SECTION_ORDER); onHiddenChange(['documents']); }}
        >
          Reset
        </Button>
      </Stack>
      <Stack spacing={0.5}>
        {order.map((sectionId, idx) => {
          const isHidden = hiddenSections.includes(sectionId);
          return (
            <Box
              key={sectionId}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: 1,
                border: 1,
                borderColor: dragOverIdx === idx ? 'primary.main' : 'divider',
                bgcolor: dragIdx === idx ? 'action.selected' : 'background.paper',
                opacity: isHidden ? 0.5 : 1,
                cursor: 'grab',
                transition: (theme) => theme.transitions.create(['border-color', 'background-color', 'opacity'], {
                  duration: theme.transitions.duration.shortest,
                }),
                '&:hover': { borderColor: 'primary.light' },
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <IconButton size="small" sx={{ cursor: 'grab', color: 'text.secondary' }}>
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, textDecoration: isHidden ? 'line-through' : 'none' }}>
                {SECTION_LABELS[sectionId] || sectionId}
              </Typography>
              <Switch
                size="small"
                checked={!isHidden}
                onChange={() => toggleVisibility(sectionId)}
                inputProps={{ 'aria-label': `Toggle ${SECTION_LABELS[sectionId] || sectionId} visibility` }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
