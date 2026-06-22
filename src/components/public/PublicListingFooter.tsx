import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

export default function PublicListingFooter() {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: 'auto',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            component="img"
            src="/Fraser.png"
            alt="Fraser Valley Real Estate Photography"
            sx={{ height: 40, width: 'auto', opacity: 0.7 }}
          />

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.06em',
              textAlign: 'center',
              fontWeight: 400,
              opacity: 0.6,
            }}
          >
            Transforming spaces with stunning photography.
          </Typography>

          <Link
            href="https://fraservalleyphotography.pro"
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            underline="none"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.06em',
              opacity: 0.4,
              '&:hover': { color: 'primary.main', opacity: 1 },
              transition: (theme) => theme.transitions.create(['color', 'opacity'], {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          >
            fraservalleyphotography.pro
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
