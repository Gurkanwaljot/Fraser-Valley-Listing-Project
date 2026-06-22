import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isPhotographer: boolean;
  isRealtor: boolean;
  isSuspended: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUserData = useCallback(async (userId: string, retries = 2): Promise<{ profile: Profile | null; roles: UserRole[] }> => {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const profile = profileResult.data as Profile | null;
    const roles = ((rolesResult.data as { role: UserRole }[] | null)?.map((r) => r.role) ?? []) as UserRole[];

    if (roles.length === 0 && retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchUserData(userId, retries - 1);
    }

    return { profile, roles };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id).then(({ profile, roles }) => {
          setState({
            user: session.user,
            session,
            profile,
            roles,
            isLoading: false,
            isAuthenticated: true,
          });
        }).catch(() => {
          setState({
            user: session.user,
            session,
            profile: null,
            roles: [],
            isLoading: false,
            isAuthenticated: true,
          });
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData(session.user.id).then(({ profile, roles }) => {
          setState({
            user: session.user,
            session,
            profile,
            roles,
            isLoading: false,
            isAuthenticated: true,
          });
        }).catch(() => {
          setState({
            user: session.user,
            session,
            profile: null,
            roles: [],
            isLoading: false,
            isAuthenticated: true,
          });
        });
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          roles: [],
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: UserRole) => state.roles.includes(role);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    hasRole,
    isAdmin: state.roles.includes('admin'),
    isPhotographer: state.roles.includes('photographer'),
    isRealtor: state.roles.includes('realtor'),
    isSuspended: !!state.profile?.is_suspended,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
