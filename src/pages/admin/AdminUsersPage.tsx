import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  getAllUsers,
  addUserRole,
  removeUserRole,
  suspendUser,
  unsuspendUser,
  getInvitations,
  revokeInvitation,
  resendInvitation,
  inviteUser,
  deleteUser,
  type AdminUser,
} from '../../services/adminService';
import type { UserRole, UserInvitation } from '../../types/database';

const ALL_ROLES: UserRole[] = ['admin', 'photographer', 'realtor'];

const ROLE_COLORS: Record<UserRole, 'primary' | 'success' | 'info'> = {
  admin: 'primary',
  photographer: 'success',
  realtor: 'info',
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'add' | 'remove' | 'suspend' | 'unsuspend' | 'delete'; role?: UserRole } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [userData, invData] = await Promise.all([getAllUsers(), getInvitations()]);
    setUsers(userData);
    setInvitations(invData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, u: AdminUser) => {
    setMenuAnchor(event.currentTarget);
    setSelectedUser(u);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleConfirm = async () => {
    if (!confirmAction || !selectedUser || !user) return;
    const userLabel = selectedUser.full_name || selectedUser.email;
    try {
      if (confirmAction.type === 'add' && confirmAction.role) {
        await addUserRole(selectedUser.id, confirmAction.role, user.id, userLabel);
        showToast(`Added ${confirmAction.role} role to ${userLabel}`);
      } else if (confirmAction.type === 'remove' && confirmAction.role) {
        await removeUserRole(selectedUser.id, confirmAction.role, user.id, userLabel);
        showToast(`Removed ${confirmAction.role} role from ${userLabel}`);
      } else if (confirmAction.type === 'suspend') {
        await suspendUser(selectedUser.id, user.id, userLabel);
        showToast(`Suspended ${userLabel}`);
      } else if (confirmAction.type === 'unsuspend') {
        await unsuspendUser(selectedUser.id, user.id, userLabel);
        showToast(`Reactivated ${userLabel}`);
      } else if (confirmAction.type === 'delete') {
        const result = await deleteUser(selectedUser.id);
        showToast(`Deleted ${userLabel}. ${result.listingsReassigned} listing(s) reassigned to you.`);
      }
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
    setConfirmAction(null);
    setSelectedUser(null);
  };

  const handleRevokeInvitation = async (inv: UserInvitation) => {
    if (!user) return;
    try {
      await revokeInvitation(inv.id, user.id);
      showToast(`Revoked invitation for ${inv.email} and removed their account`);
      await loadData();
    } catch {
      showToast('Failed to revoke invitation', 'error');
    }
  };

  const handleResendInvitation = async (inv: UserInvitation) => {
    try {
      await resendInvitation(inv.id);
      showToast(`Resent invitation to ${inv.email}`);
      await loadData();
    } catch {
      showToast('Failed to resend invitation', 'error');
    }
  };

  const missingRoles = selectedUser ? ALL_ROLES.filter((r) => !selectedUser.roles.includes(r)) : [];
  const currentRoles = selectedUser?.roles ?? [];

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  const getConfirmMessage = () => {
    if (!confirmAction || !selectedUser) return '';
    const name = selectedUser.full_name || selectedUser.email;
    switch (confirmAction.type) {
      case 'add': return `Add the "${confirmAction.role}" role to ${name}?`;
      case 'remove': return `Remove the "${confirmAction.role}" role from ${name}? This may revoke their access.`;
      case 'suspend': return `Suspend ${name}? They will be blocked from accessing the dashboard.`;
      case 'unsuspend': return `Reactivate ${name}? They will be able to sign in again.`;
      case 'delete': return `Permanently delete ${name}? All their listings will be reassigned to you (admin). This action cannot be undone.`;
      default: return '';
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'add': return 'Add Role';
      case 'remove': return 'Remove Role';
      case 'suspend': return 'Suspend User';
      case 'unsuspend': return 'Reactivate User';
      case 'delete': return 'Delete User';
      default: return '';
    }
  };

  return (
    <Box>
      <PageHeader
        title="Users & Roles"
        description="Manage user accounts, roles, and invitations"
        action={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite User
          </Button>
        }
      />

      {loading ? (
        <Stack spacing={isMobile ? 1.5 : 0}>
          {[1, 2, 3, 4, 5].map((i) =>
            isMobile ? (
              <Paper key={i} sx={{ p: 2 }}><Skeleton height={60} /></Paper>
            ) : (
              <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
            )
          )}
        </Stack>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {users.map((u) => (
            <Card key={u.id} sx={{ bgcolor: 'background.paper', opacity: u.is_suspended ? 0.6 : 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" noWrap>{u.full_name || 'Unnamed'}</Typography>
                      {u.is_suspended && <Chip label="Suspended" size="small" color="error" variant="outlined" sx={{ fontSize: '0.625rem', height: 20 }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">{u.email}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {u.roles.map((role) => (
                        <Chip key={role} label={role} size="small" color={ROLE_COLORS[role]} variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.6875rem', height: 22 }} />
                      ))}
                      {u.roles.length === 0 && (
                        <Typography variant="caption" color="text.disabled">No roles</Typography>
                      )}
                    </Stack>
                  </Box>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, u)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover sx={{ opacity: u.is_suspended ? 0.6 : 1 }}>
                    <TableCell>
                      <Typography variant="body2">{u.full_name || 'Unnamed'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {u.roles.map((role) => (
                          <Chip key={role} label={role} size="small" color={ROLE_COLORS[role]} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                        ))}
                        {u.roles.length === 0 && (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {u.is_suspended ? (
                        <Chip label="Suspended" size="small" color="error" variant="outlined" />
                      ) : (
                        <Chip label="Active" size="small" color="success" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{formatDate(u.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, u)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 400, mb: 2 }}>
            Pending Invitations
          </Typography>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Invited</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell sx={{ width: 100 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Typography variant="body2">{inv.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{inv.full_name || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={inv.role}
                          size="small"
                          color={ROLE_COLORS[inv.role as UserRole] || 'default'}
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{formatDate(inv.invited_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{formatDate(inv.expires_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<ReplayIcon />}
                            onClick={() => handleResendInvitation(inv)}
                          >
                            Resend
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRevokeInvitation(inv)}
                          >
                            Revoke
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {missingRoles.length > 0 && (
          <MenuItem disabled sx={{ opacity: 1 }}>
            <Typography variant="caption" color="text.secondary">Add role</Typography>
          </MenuItem>
        )}
        {missingRoles.map((role) => (
          <MenuItem
            key={`add-${role}`}
            onClick={() => { handleMenuClose(); setConfirmAction({ type: 'add', role }); }}
          >
            <ListItemIcon><AddCircleIcon fontSize="small" color="success" /></ListItemIcon>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{role}</Typography>
          </MenuItem>
        ))}
        {currentRoles.length > 0 && (
          <MenuItem disabled sx={{ opacity: 1 }}>
            <Typography variant="caption" color="text.secondary">Remove role</Typography>
          </MenuItem>
        )}
        {currentRoles.map((role) => (
          <MenuItem
            key={`remove-${role}`}
            onClick={() => { handleMenuClose(); setConfirmAction({ type: 'remove', role }); }}
          >
            <ListItemIcon><RemoveCircleIcon fontSize="small" color="error" /></ListItemIcon>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{role}</Typography>
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        {selectedUser && !selectedUser.is_suspended && selectedUser.id !== user?.id && (
          <MenuItem onClick={() => { handleMenuClose(); setConfirmAction({ type: 'suspend' }); }}>
            <ListItemIcon><BlockIcon fontSize="small" color="error" /></ListItemIcon>
            <Typography variant="body2">Suspend</Typography>
          </MenuItem>
        )}
        {selectedUser && selectedUser.is_suspended && (
          <MenuItem onClick={() => { handleMenuClose(); setConfirmAction({ type: 'unsuspend' }); }}>
            <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
            <Typography variant="body2">Reactivate</Typography>
          </MenuItem>
        )}
        {selectedUser && selectedUser.id !== user?.id && (
          <MenuItem onClick={() => { handleMenuClose(); setConfirmAction({ type: 'delete' }); }}>
            <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
            <Typography variant="body2" color="error.main">Delete User</Typography>
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={!!confirmAction}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        confirmLabel={getConfirmTitle()}
        confirmColor={confirmAction?.type === 'remove' || confirmAction?.type === 'suspend' || confirmAction?.type === 'delete' ? 'error' : 'primary'}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmAction(null); setSelectedUser(null); }}
      />

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => { setInviteOpen(false); loadData(); }}
      />
    </Box>
  );
}

function InviteDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('photographer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await inviteUser(email, fullName, role);
      showToast(`Invitation sent to ${email}`);
      setEmail('');
      setFullName('');
      setRole('photographer');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Invite User</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              native
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="photographer">Photographer</option>
              <option value="realtor">Realtor</option>
              <option value="admin">Admin</option>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !email}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
