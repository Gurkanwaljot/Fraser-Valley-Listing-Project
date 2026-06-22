import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRoles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, roles, isSuspended, signOut } = useAuth();

  useEffect(() => {
    if (isSuspended && isAuthenticated) {
      signOut();
    }
  }, [isSuspended, isAuthenticated, signOut]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (isSuspended) {
    return <SuspendedPage onSignOut={signOut} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => roles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function SuspendedPage({ onSignOut }: { onSignOut: () => void }) {
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
      <Paper sx={{ maxWidth: 440, width: '100%', p: { xs: 3, sm: 5 }, bgcolor: 'surface.main', textAlign: 'center' }}>
        <Box sx={{ width: 40, height: '1px', bgcolor: 'error.main', opacity: 0.6, mx: 'auto', mb: 3 }} />
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 400, mb: 1.5 }}>
          Account Suspended
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
          Your account has been suspended by an administrator. If you believe this is an error, please contact your team lead.
        </Typography>
        <Button
          variant="outlined"
          onClick={onSignOut}
          sx={{
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': { borderColor: 'error.main', color: 'error.main' },
          }}
        >
          Sign Out
        </Button>
      </Paper>
    </Box>
  );
}
