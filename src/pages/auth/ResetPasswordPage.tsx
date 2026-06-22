import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { supabase } from '../../lib/supabase';
import { APP_NAME } from '../../lib/constants';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 5 },
          bgcolor: 'surface.main',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', mb: 1, display: 'block' }}>
            {APP_NAME}
          </Typography>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Enter your email to receive a password reset link
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {sent ? (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Check your email for a password reset link.
            </Alert>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              If you don't see it within a few minutes, check your spam folder.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
            >
              Back to Login
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.5, mb: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="text"
                size="small"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
