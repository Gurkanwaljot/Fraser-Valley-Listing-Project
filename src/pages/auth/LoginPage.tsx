import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../lib/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, isAuthenticated, isLoading: authLoading, isAdmin, isPhotographer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !authLoading && (isAdmin || isPhotographer)) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, isAdmin, isPhotographer, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isAuthenticated) {
      await signOut();
    }

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
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
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Sign in to your photographer dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 1 }}
          />
          <Box sx={{ textAlign: 'right', mb: 2.5 }}>
            <Button
              component={RouterLink}
              to="/auth/reset-password"
              variant="text"
              size="small"
              sx={{ color: 'text.secondary', fontSize: '0.75rem', p: 0, minWidth: 0, '&:hover': { color: 'primary.main' } }}
            >
              Forgot Password?
            </Button>
          </Box>
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.secondary' }}>
          Realtors: Use the OTP access link provided to you
        </Typography>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            component={RouterLink}
            to="/"
            variant="text"
            size="small"
            startIcon={<HomeIcon />}
            sx={{ color: 'text.disabled', fontSize: '0.75rem', '&:hover': { color: 'text.secondary' } }}
          >
            Back to Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
