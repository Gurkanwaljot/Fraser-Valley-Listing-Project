import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setWebsiteUrl(profile.website_url || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          company_name: companyName.trim() || null,
          phone: phone.trim() || null,
          website_url: websiteUrl.trim() || null,
          bio: bio.trim() || null,
        } as never)
        .eq('id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400 }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Manage your profile and preferences
        </Typography>
      </Box>

      <Paper sx={{ p: 4, bgcolor: 'surface.main', maxWidth: 600 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.dark', color: 'primary.contrastText', fontSize: '1.5rem' }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: 'text.primary' }}>
              {profile?.full_name || 'User'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {profile?.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            fullWidth
            label="Website"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
          <TextField
            fullWidth
            label="Bio"
            multiline
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
