import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import PageHeader from '../../components/common/PageHeader';
import FeaturePicker from '../../components/listings/FeaturePicker';
import { useCreateListing } from '../../hooks/useListings';
import { useFeatureSuggestions } from '../../hooks/useFeatureSuggestions';
import { useToast } from '../../hooks/useToast';
import { generateSlug, checkSlugUniqueness } from '../../utils/slugify';
import { ROUTES } from '../../lib/constants';
import { useAddressAutocomplete, type AddressComponents } from '../../hooks/useGoogleMaps';

const STEPS = ['Property Details', 'URL Slug', 'Features', 'Review'];

const PROPERTY_TYPES = [
  'Detached',
  'Semi-Detached',
  'Townhouse',
  'Condo',
  'Duplex',
  'Triplex',
  'Bungalow',
  'Estate',
  'Vacant Land',
  'Commercial',
  'Other',
];

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
  slug: string;
  features: string[];
}

const initialFormData: FormData = {
  property_type: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  province_state: '',
  postal_code: '',
  country: 'Canada',
  price: '',
  property_taxes: '',
  bedrooms: '',
  bathrooms: '',
  square_footage: '',
  lot_size: '',
  year_built: '',
  mls_number: '',
  description: '',
  slug: '',
  features: [],
};

export default function ListingCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createListing = useCreateListing();
  const { syncUsage } = useFeatureSuggestions();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const addressInputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelected = useCallback((address: AddressComponents) => {
    setForm((prev) => ({
      ...prev,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || prev.address_line_2,
      city: address.city,
      province_state: address.province_state,
      postal_code: address.postal_code,
      country: address.country,
    }));
    setErrors((prev) => ({
      ...prev,
      address_line_1: '',
      city: '',
      province_state: '',
      postal_code: '',
    }));
  }, []);

  useAddressAutocomplete(addressInputRef, handlePlaceSelected);

  const buildTitle = () => {
    const streetLine = form.address_line_2
      ? `${form.address_line_2} - ${form.address_line_1}`
      : form.address_line_1;
    return [streetLine, form.city, form.province_state].filter(Boolean).join(', ');
  };

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const generateSlugFromAddress = () => {
    const address = `${form.address_line_1} ${form.city}`.trim();
    if (address) {
      const slug = generateSlug(address);
      setForm((prev) => ({ ...prev, slug }));
      verifySlug(slug);
    }
  };

  const verifySlug = async (slug: string) => {
    if (!slug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    const isAvailable = await checkSlugUniqueness(slug);
    setSlugStatus(isAvailable ? 'available' : 'taken');
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm((prev) => ({ ...prev, slug }));
    if (slug.length > 2) verifySlug(slug);
    else setSlugStatus('idle');
  };

  const addFeature = (feature: string) => {
    if (!form.features.some((f) => f.toLowerCase() === feature.toLowerCase())) {
      setForm((prev) => ({ ...prev, features: [...prev.features, feature] }));
    }
  };

  const removeFeature = (feature: string) => {
    setForm((prev) => ({ ...prev, features: prev.features.filter((f) => f !== feature) }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!form.address_line_1.trim()) newErrors.address_line_1 = 'Address is required';
      if (!form.city.trim()) newErrors.city = 'City is required';
      if (!form.province_state.trim()) newErrors.province_state = 'Province/State is required';
      if (!form.postal_code.trim()) newErrors.postal_code = 'Postal code is required';
    } else if (step === 1) {
      if (!form.slug.trim()) newErrors.slug = 'Slug is required';
      if (slugStatus === 'taken') newErrors.slug = 'This slug is already taken';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep === 0 && !form.slug) {
        generateSlugFromAddress();
      }
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSaveDraft = async () => {
    if (!form.address_line_1.trim() || !form.city.trim() || !form.province_state.trim() || !form.postal_code.trim()) {
      showToast('Address fields are required to save', 'warning');
      return;
    }
    const slug = form.slug || generateSlug(`${form.address_line_1} ${form.city}`);
    await submitListing(slug);
  };

  const handleSubmit = async () => {
    await submitListing(form.slug);
  };

  const submitListing = async (slug: string) => {
    try {
      await createListing.mutateAsync({
        title: buildTitle(),
        slug,
        property_type: form.property_type || undefined,
        description: form.description.trim() || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        property_taxes: form.property_taxes ? parseFloat(form.property_taxes) : undefined,
        address_line_1: form.address_line_1.trim(),
        address_line_2: form.address_line_2.trim() || undefined,
        city: form.city.trim(),
        province_state: form.province_state.trim(),
        postal_code: form.postal_code.trim(),
        country: form.country.trim() || 'Canada',
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : undefined,
        square_footage: form.square_footage ? parseInt(form.square_footage) : undefined,
        lot_size: form.lot_size.trim() || undefined,
        year_built: form.year_built ? parseInt(form.year_built) : undefined,
        mls_number: form.mls_number.trim() || undefined,
        features: form.features.length > 0 ? form.features : undefined,
      });
      if (form.features.length > 0) syncUsage(form.features);
      showToast('Listing created as draft');
      navigate(ROUTES.DASHBOARD_LISTINGS);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create listing', 'error');
    }
  };

  const formatPrice = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.DASHBOARD_LISTINGS)} sx={{ mb: 2 }}>
        Back to Listings
      </Button>

      <PageHeader
        title="Create Listing"
        description="Add a new property listing"
        action={
          <Button variant="outlined" onClick={handleSaveDraft} disabled={createListing.isPending}>
            Save Progress
          </Button>
        }
      />

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4 }}>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Property Type"
                select
                fullWidth
                value={form.property_type}
                onChange={handleChange('property_type')}
              >
                <MenuItem value="">Select type...</MenuItem>
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="MLS Number"
                fullWidth
                value={form.mls_number}
                onChange={handleChange('mls_number')}
              />
            </Grid>
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="overline" color="text.secondary">Address</Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Address Line 1"
                required
                fullWidth
                value={form.address_line_1}
                onChange={handleChange('address_line_1')}
                error={!!errors.address_line_1}
                helperText={errors.address_line_1 || 'Start typing to see address suggestions'}
                inputRef={addressInputRef}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Unit / Suite Number"
                fullWidth
                value={form.address_line_2}
                onChange={handleChange('address_line_2')}
                placeholder="e.g. 331"
                helperText="Auto-filled when available from address search"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="City"
                required
                fullWidth
                value={form.city}
                onChange={handleChange('city')}
                error={!!errors.city}
                helperText={errors.city}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Province / State"
                required
                fullWidth
                value={form.province_state}
                onChange={handleChange('province_state')}
                error={!!errors.province_state}
                helperText={errors.province_state}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Postal Code"
                required
                fullWidth
                value={form.postal_code}
                onChange={handleChange('postal_code')}
                error={!!errors.postal_code}
                helperText={errors.postal_code}
              />
            </Grid>
            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="overline" color="text.secondary">Property Details</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Price"
                fullWidth
                type="number"
                value={form.price}
                onChange={handleChange('price')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Annual property taxes ($)"
                fullWidth
                type="number"
                value={form.property_taxes}
                onChange={handleChange('property_taxes')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Bedrooms"
                fullWidth
                type="number"
                value={form.bedrooms}
                onChange={handleChange('bedrooms')}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Bathrooms"
                fullWidth
                type="number"
                value={form.bathrooms}
                onChange={handleChange('bathrooms')}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Living Area (sq. ft.)"
                fullWidth
                type="number"
                value={form.square_footage}
                onChange={handleChange('square_footage')}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Lot Size (sq. ft.)"
                fullWidth
                value={form.lot_size}
                onChange={handleChange('lot_size')}
                placeholder="e.g. 5000"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Year Built"
                fullWidth
                type="number"
                value={form.year_built}
                onChange={handleChange('year_built')}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={form.description}
                onChange={handleChange('description')}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Box sx={{ maxWidth: 500 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The URL slug determines the public link for this listing. It has been auto-generated
              from the property address but you can customize it.
            </Typography>
            <TextField
              label="URL Slug"
              required
              fullWidth
              value={form.slug}
              onChange={handleSlugChange}
              error={!!errors.slug || slugStatus === 'taken'}
              helperText={
                errors.slug ||
                (slugStatus === 'taken' ? 'This slug is already taken' : '')
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {slugStatus === 'checking' && <CircularProgress size={18} />}
                      {slugStatus === 'available' && <CheckCircleIcon sx={{ color: 'success.main' }} />}
                      {slugStatus === 'taken' && <ErrorIcon sx={{ color: 'error.main' }} />}
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Public URL: /listing/{form.slug || '...'}
            </Typography>
            <Button size="small" onClick={generateSlugFromAddress} sx={{ mt: 1 }}>
              Regenerate from Address
            </Button>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add features and highlights for this property. Select from suggestions or type your own.
            </Typography>
            <FeaturePicker
              selected={form.features}
              onAdd={addFeature}
              onRemove={removeFeature}
            />
          </Box>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 400 }}>Review Your Listing</Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Typography variant="overline" color="text.secondary">Address</Typography>
                <Typography variant="body1">
                  {form.address_line_2 ? `${form.address_line_2} - ${form.address_line_1}` : form.address_line_1}, {form.city}, {form.province_state} {form.postal_code}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary">Property Type</Typography>
                <Typography variant="body1">{form.property_type || 'Not specified'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Price</Typography>
                <Typography variant="body1">{form.price ? formatPrice(form.price) : 'N/A'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Beds / Baths</Typography>
                <Typography variant="body1">{form.bedrooms || '-'} / {form.bathrooms || '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Living Area</Typography>
                <Typography variant="body1">{form.square_footage ? `${parseInt(form.square_footage).toLocaleString()} sq. ft.` : 'N/A'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="overline" color="text.secondary">Year Built</Typography>
                <Typography variant="body1">{form.year_built || 'N/A'}</Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="overline" color="text.secondary">URL Slug</Typography>
                <Typography variant="body2" color="primary.main">/listing/{form.slug}</Typography>
              </Grid>
              {form.features.length > 0 && (
                <Grid size={12}>
                  <Typography variant="overline" color="text.secondary">Features</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {form.features.map((f) => <Chip key={f} label={f} size="small" variant="outlined" />)}
                  </Box>
                </Grid>
              )}
              {form.description && (
                <Grid size={12}>
                  <Typography variant="overline" color="text.secondary">Description</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {form.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Back</Button>
          )}
          <Box sx={{ flex: 1 }} />
          {activeStep < STEPS.length - 1 ? (
            <Button variant="contained" onClick={handleNext}>Next</Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={createListing.isPending || slugStatus === 'taken'}
            >
              {createListing.isPending ? 'Creating...' : 'Save as Draft'}
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
