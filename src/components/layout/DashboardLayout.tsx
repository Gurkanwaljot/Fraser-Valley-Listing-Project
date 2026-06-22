import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import StorageIcon from '@mui/icons-material/Storage';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../lib/constants';

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: 'Overview', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Listings', path: '/dashboard/listings', icon: <HomeWorkIcon /> },
  { label: 'Realtors', path: '/dashboard/realtors', icon: <PeopleIcon /> },
  { label: 'Analytics', path: '/dashboard/analytics', icon: <AnalyticsIcon /> },
  { label: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon /> },
];

const ADMIN_ITEMS = [
  { label: 'Users & Roles', path: '/admin/users', icon: <AdminPanelSettingsIcon /> },
  { label: 'All Listings', path: '/admin/listings', icon: <HomeWorkIcon /> },
  { label: 'Platform Analytics', path: '/admin/analytics', icon: <AnalyticsIcon /> },
  { label: 'Audit Log', path: '/admin/audit', icon: <HistoryIcon /> },
  { label: 'Storage', path: '/admin/storage', icon: <StorageIcon /> },
];

export function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isAdmin } = useAuth();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Box
          component="img"
          src="/Fraser.png"
          alt={APP_NAME}
          sx={{ height: 36, width: 'auto' }}
        />
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '& .MuiListItemIcon-root': { color: 'primary.main' },
                '& .MuiListItemText-primary': { color: 'primary.main' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        ))}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            {ADMIN_ITEMS.map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { bgcolor: 'action.selected' } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, color: 'text.primary' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.dark', color: 'primary.contrastText', fontSize: '0.875rem' }}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {profile?.email || 'User'}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/dashboard/settings'); }}>
                <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                Settings
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); signOut(); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
