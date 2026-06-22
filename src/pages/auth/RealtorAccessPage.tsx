import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import { supabase } from '../../lib/supabase';
import { APP_NAME, ROUTES } from '../../lib/constants';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const RESEND_COOLDOWN = 60;

type PageState = 'email' | 'otp' | 'not_found' | 'rate_limited' | 'verified';

export default function RealtorAccessPage() {
  const [email, setEmail] = useState('');
  const [pageState, setPageState] = useState<PageState>('email');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [realtorName, setRealtorName] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCountdown > 0]);

  const sendOtpEmail = async (): Promise<boolean> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    const body = await response.json();

    if (!response.ok) {
      if (response.status === 403 && body.code === 'REALTOR_NOT_FOUND') {
        setPageState('not_found');
        return false;
      }
      if (response.status === 429) {
        setPageState('rate_limited');
        return false;
      }
      throw new Error(body.error || 'Failed to send verification code');
    }

    if (body.realtorName) {
      setRealtorName(body.realtorName);
    }
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sent = await sendOtpEmail();
      if (sent) {
        setPageState('otp');
        setSuccess('A verification code has been sent to your email.');
        setResendCountdown(RESEND_COOLDOWN);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    try {
      const sent = await sendOtpEmail();
      if (sent) {
        setSuccess('A new verification code has been sent.');
        setResendCountdown(RESEND_COOLDOWN);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, code: otp }),
      });

      const result = await response.json();

      if (!result.valid) {
        setError(result.error || 'Invalid or expired code');
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: 'magiclink',
      });

      if (verifyError) {
        setError(verifyError.message);
      } else {
        setPageState('verified');
        setTimeout(() => {
          const returnTo = new URLSearchParams(window.location.search).get('returnTo');
          window.location.href = returnTo || ROUTES.REALTOR_LISTINGS;
        }, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
    setLoading(false);
  };

  const resetToEmail = () => {
    setPageState('email');
    setSuccess('');
    setOtp('');
    setError('');
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
      <Box sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper sx={{ width: '100%', p: { xs: 3, sm: 5 }, bgcolor: 'surface.main' }}>
        {/* Verified State */}
        {pageState === 'verified' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400, mb: 1 }}>
              Verified
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {realtorName ? `Welcome back, ${realtorName.split(' ')[0]}` : 'Taking you to your listings'}...
            </Typography>
            <LinearProgress sx={{ mt: 3, borderRadius: 1, height: 2, bgcolor: 'rgba(200,164,93,0.1)', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
          </Box>
        )}

        {/* Not Found State */}
        {pageState === 'not_found' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 40, height: '1px', bgcolor: 'primary.main', opacity: 0.6, mx: 'auto', mb: 3 }} />
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400, mb: 1.5 }}>
              We don't have this email on file
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7 }}>
              This means we haven't worked together yet. We'd love to help you showcase your next listing with stunning photography and video.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              href="https://fraservalleyphotography.pro/booking"
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
              sx={{ py: 1.5, mb: 2 }}
            >
              Book a Shoot
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={resetToEmail}
              sx={{ color: 'text.secondary' }}
            >
              Try a different email
            </Button>
          </Box>
        )}

        {/* Rate Limited State */}
        {pageState === 'rate_limited' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 40, height: '1px', bgcolor: 'warning.main', opacity: 0.6, mx: 'auto', mb: 3 }} />
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400, mb: 1.5 }}>
              Too many attempts
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7 }}>
              You've made too many verification requests. Please wait a few minutes before trying again.
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              onClick={resetToEmail}
              sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
            >
              Back to Login
            </Button>
          </Box>
        )}

        {/* Email Input State */}
        {pageState === 'email' && (
          <>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', mb: 1, display: 'block' }}>
                {APP_NAME}
              </Typography>
              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400 }}>
                Realtor Access
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Verify your email to access your listing downloads
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSendOtp}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
                helperText="Enter the email address associated with your listing"
              />
              <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.5 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Verification Code'}
              </Button>
            </Box>
          </>
        )}

        {/* OTP Input State */}
        {pageState === 'otp' && (
          <>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', mb: 1, display: 'block' }}>
                {APP_NAME}
              </Typography>
              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 400 }}>
                Realtor Access
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {realtorName ? `Hi ${realtorName.split(' ')[0]}, enter` : 'Enter'} the code sent to your email
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <Box component="form" onSubmit={handleVerifyOtp}>
              <TextField
                fullWidth
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                sx={{ mb: 3 }}
                helperText="Enter the 6-digit code sent to your email"
              />
              <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.5 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Verify & Access'}
              </Button>

              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="text"
                  disabled={resendCountdown > 0}
                  onClick={handleResend}
                  sx={{ color: resendCountdown > 0 ? 'text.disabled' : 'primary.main' }}
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Verification Code'}
                </Button>
                {resendCountdown > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={(resendCountdown / RESEND_COOLDOWN) * 100}
                    sx={{
                      mt: 0.5,
                      borderRadius: 1,
                      height: 4,
                      bgcolor: 'rgba(200,164,93,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                    }}
                  />
                )}
              </Box>

              <Button
                fullWidth
                variant="text"
                sx={{ mt: 1, color: 'text.secondary' }}
                onClick={resetToEmail}
              >
                Use a different email
              </Button>
            </Box>
          </>
        )}
      </Paper>
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
      </Box>
    </Box>
  );
}
