import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';

export function PublicLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Outlet />
    </Box>
  );
}
