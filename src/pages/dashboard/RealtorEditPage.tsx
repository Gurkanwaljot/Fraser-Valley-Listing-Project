import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import PageHeader from '../../components/common/PageHeader';
import { useRealtor, useUpdateRealtor } from '../../hooks/useRealtors';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { checkRealtorEmailUniqueness } from '../../services/realtorsService';
import { supabase } from '../../lib/supabase';
import { resizeToWebPThumbnail } from '../../utils/imageResize';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  brokerage: string;
  bio: string;
  instagram_url: string;
  linkedin_url: string;
  website_url: string;
}

export default function RealtorEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: realtor, isLoading } = useRealtor(id);
  const updateRealtor = useUpdateRealtor();
  const [form, setForm] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (realtor && !form) {
      setForm({
        full_name: realtor.full_name,
        email: realtor.email,
        phone: realtor.phone || '',
        brokerage: realtor.brokerage || '',
        bio: realtor.bio || '',
        instagram_url: realtor.instagram_url || '',
        linkedin_url: realtor.linkedin_url || '',
        website_url: realtor.website_url || '',
      });
      if (realtor.headshot_url) {
        setHeadshotPreview(realtor.headshot_url);
      }
      if (realtor.brokerage_logo_url) {
        setLogoPreview(realtor.brokerage_logo_url);
      }
    }
  }, [realtor, form]);

  const handleHeadshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    setHeadshotFile(file);
    setHeadshotPreview(URL.createObjectURL(file));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo must be under 5MB', 'error');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadToBucket = async (file: File, bucket: string): Promise<string | null> => {
    const optimized = await resizeToWebPThumbnail(file);
    const path = `${user!.id}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from(bucket).upload(path, optimized, {
      contentType: 'image/webp',
    });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  if (isLoading || !form) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="30%" height={40} sx={{ mb: 4 }} />
        <Paper sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}>
                <Skeleton height={56} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEmail = async () => {
    if (!form.email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email format' }));
      return;
    }
    if (form.email !== realtor?.email) {
      const isUnique = await checkRealtorEmailUniqueness(form.email, user!.id, id);
      if (!isUnique) {
        setErrors((prev) => ({ ...prev, email: 'A realtor with this email already exists' }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      let headshot_url: string | undefined;
      if (headshotFile) {
        const url = await uploadToBucket(headshotFile, 'headshots');
        if (url) headshot_url = url;
      }
      let brokerage_logo_url: string | undefined;
      if (logoFile) {
        const url = await uploadToBucket(logoFile, 'brokerage-logos');
        if (url) brokerage_logo_url = url;
      }

      await updateRealtor.mutateAsync({
        id: id!,
        data: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          brokerage: form.brokerage.trim() || undefined,
          bio: form.bio.trim() || undefined,
          instagram_url: form.instagram_url.trim() || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
          website_url: form.website_url.trim() || undefined,
          ...(headshot_url ? { headshot_url } : {}),
          ...(brokerage_logo_url ? { brokerage_logo_url } : {}),
        },
      });
      showToast('Realtor updated');
      navigate(`/dashboard/realtors/${id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update realtor', 'error');
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/dashboard/realtors/${id}`)}
        sx={{ mb: 2 }}
      >
        Back to Profile
      </Button>

      <PageHeader title="Edit Realtor" />

      <Paper sx={{ p: 4, maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={headshotPreview || undefined}
                sx={{ width: 80, height: 80, bgcolor: 'primary.dark', fontSize: '2rem' }}
              >
                {form.full_name ? form.full_name.charAt(0).toUpperCase() : 'R'}
              </Avatar>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: 28,
                  height: 28,
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleHeadshotChange}
              />
            </Box>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" color="text.primary">
                Profile Photo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPG, PNG, or WebP. Max 5MB.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                backgroundColor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {logoPreview ? (
                <Box
                  component="img"
                  src={logoPreview}
                  alt="Brokerage logo"
                  sx={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Logo
                </Typography>
              )}
              <IconButton
                size="small"
                onClick={() => logoInputRef.current?.click()}
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: 28,
                  height: 28,
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                hidden
                onChange={handleLogoChange}
              />
            </Box>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" color="text.primary">
                Brokerage Logo (optional)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Used in social posts. PNG with transparent background recommended. Max 5MB.
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Full Name"
                required
                fullWidth
                value={form.full_name}
                onChange={handleChange('full_name')}
                error={!!errors.full_name}
                helperText={errors.full_name}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={form.email}
                onChange={handleChange('email')}
                onBlur={validateEmail}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Brokerage"
                fullWidth
                value={form.brokerage}
                onChange={handleChange('brokerage')}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Bio"
                fullWidth
                multiline
                rows={3}
                value={form.bio}
                onChange={handleChange('bio')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Instagram URL"
                fullWidth
                value={form.instagram_url}
                onChange={handleChange('instagram_url')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="LinkedIn URL"
                fullWidth
                value={form.linkedin_url}
                onChange={handleChange('linkedin_url')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Website URL"
                fullWidth
                value={form.website_url}
                onChange={handleChange('website_url')}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={updateRealtor.isPending}
            >
              {updateRealtor.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/dashboard/realtors/${id}`)}
            >
              Cancel
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
