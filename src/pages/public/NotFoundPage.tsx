import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { keyframes } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const lineExpand = keyframes`
  0% { width: 0; opacity: 0; }
  100% { width: 64px; opacity: 0.6; }
`;

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        px: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 500,
          height: 500,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(200, 164, 93, 0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          height: '1px',
          bgcolor: 'primary.main',
          mb: 4,
          animation: `${lineExpand} 1s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
        }}
      />

      <Typography
        variant="h1"
        sx={{
          color: 'text.primary',
          fontWeight: 400,
          fontSize: { xs: '4rem', md: '6rem' },
          letterSpacing: '-0.04em',
          lineHeight: 1,
          mb: 2,
        }}
      >
        404
      </Typography>

      <Typography
        variant="h5"
        sx={{ color: 'text.secondary', fontWeight: 400, mb: 1, textAlign: 'center' }}
      >
        Page not found
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', opacity: 0.6, fontWeight: 400, mb: 4, textAlign: 'center' }}
      >
        The page you are looking for does not exist or has been moved.
      </Typography>

      <Button
        variant="outlined"
        onClick={() => navigate('/')}
        sx={{
          borderColor: 'divider',
          color: 'text.secondary',
          px: 4,
          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        }}
      >
        Back to Home
      </Button>
    </Box>
  );
}
