import { supabase } from '../lib/supabase';
import type { UserRole, AuditLog, AuditActionCount, UserInvitation } from '../types/database';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  created_at: string;
  is_suspended: boolean;
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at, is_suspended')
    .order('created_at', { ascending: false });

  if (profileErr || !profiles) return [];

  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role');

  const roleMap = new Map<string, UserRole[]>();
  if (roles) {
    for (const r of roles as { user_id: string; role: UserRole }[]) {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    }
  }

  return (profiles as { id: string; email: string; full_name: string; created_at: string; is_suspended: boolean }[]).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    roles: roleMap.get(p.id) || [],
    created_at: p.created_at,
    is_suspended: p.is_suspended,
  }));
}

export async function suspendUser(userId: string, actorId: string, userLabel?: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_suspended: true } as never)
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logAudit(actorId, 'user_suspended', 'user', userId, { entity_label: userLabel });
}

export async function unsuspendUser(userId: string, actorId: string, userLabel?: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_suspended: false } as never)
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await logAudit(actorId, 'user_unsuspended', 'user', userId, { entity_label: userLabel });
}

export async function getInvitations(): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .order('invited_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as UserInvitation[];
}

export async function revokeInvitation(invitationId: string, _actorId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/revoke-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ invitationId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Revoke failed' }));
    throw new Error(body.error || `Revoke failed (${response.status})`);
  }
}

export async function resendInvitation(invitationId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/resend-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ invitationId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Resend failed' }));
    throw new Error(body.error || `Resend failed (${response.status})`);
  }
}

export async function deleteUser(userId: string): Promise<{ listingsReassigned: number }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(body.error || `Delete failed (${response.status})`);
  }

  const result = await response.json();
  return { listingsReassigned: result.listingsReassigned || 0 };
}

export async function acceptInvitation(): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const response = await fetch(`${supabaseUrl}/functions/v1/accept-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    // Non-critical: don't throw, just log
    console.error('Failed to accept invitation');
  }
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, full_name: fullName, role }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Invitation failed' }));
    throw new Error(body.error || `Invitation failed (${response.status})`);
  }
}

export async function addUserRole(userId: string, role: UserRole, actorId: string, userLabel?: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role } as never);

  if (error) {
    if (error.code === '23505') return;
    throw new Error(error.message);
  }

  await logAudit(actorId, 'role_added', 'user', userId, { role, entity_label: userLabel });
}

export async function removeUserRole(userId: string, role: UserRole, actorId: string, userLabel?: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw new Error(error.message);

  await logAudit(actorId, 'role_removed', 'user', userId, { role, entity_label: userLabel });
}

export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const actorLabel = user?.user_metadata?.full_name || user?.email || null;
  await supabase
    .from('audit_logs')
    .insert({
      actor_user_id: actorId,
      actor_label: actorLabel,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: (metadata.entity_label as string) || null,
      metadata,
    } as never);
}

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  entityType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getAuditLogs(
  limit = 50,
  offset = 0,
  filters: AuditLogFilters = {}
): Promise<{ logs: AuditLog[]; total: number }> {
  const { data, error } = await (supabase.rpc as CallableFunction)('get_audit_logs', {
    p_limit: limit,
    p_offset: offset,
    p_action_filter: filters.action || null,
    p_actor_filter: filters.actorId || null,
    p_entity_type_filter: filters.entityType || null,
    p_search: filters.search || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as (AuditLog & { total_count: number })[];
  const total = rows.length > 0 ? rows[0].total_count : 0;
  const logs: AuditLog[] = rows.map(({ total_count: _, ...row }) => row as unknown as AuditLog);

  return { logs, total };
}

export async function getAuditActions(): Promise<AuditActionCount[]> {
  const { data, error } = await (supabase.rpc as CallableFunction)('get_audit_actions');
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditActionCount[];
}

export async function getAllListingsAdmin(): Promise<{
  id: string;
  title: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  status: string;
  photographer_id: string;
  photographer_name: string;
  created_at: string;
  slug: string;
}[]> {
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, address_line_1, address_line_2, city, status, photographer_id, slug, created_at')
    .order('created_at', { ascending: false });

  if (!listings || listings.length === 0) return [];

  const photographerIds = [...new Set(
    (listings as { photographer_id: string }[]).map((l) => l.photographer_id)
  )];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', photographerIds);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [(p as { id: string }).id, (p as { id: string; full_name: string }).full_name])
  );

  return (listings as {
    id: string;
    title: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    status: string;
    photographer_id: string;
    slug: string;
    created_at: string;
  }[]).map((l) => ({
    ...l,
    photographer_name: nameMap.get(l.photographer_id) || 'Unknown',
  }));
}
