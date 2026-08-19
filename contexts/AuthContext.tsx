'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { onAuthChange, getUserProfile, signOut as supabaseSignOut } from '@/lib/supabase/auth';
import { UserProfile } from '@/types/types';
import { useDashboard } from '@/hooks/useDashboard';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refetch: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refetch: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { loadWishlist, clearWishlist, loadPreferences, clearPreferences } = useDashboard();

  const refetch = useCallback(async (user: User) => {
    if (!user) return;
    setProfile(await getUserProfile(user.id));
    await loadWishlist(user.id);
    await loadPreferences(user.id);
  }, [loadWishlist, loadPreferences]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);

      if (user) {
        setProfile(await getUserProfile(user.id));
        await loadWishlist(user.id);
        await loadPreferences(user.id);
      } else {
        setProfile(null);
        clearWishlist();
        clearPreferences();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadWishlist, clearWishlist, loadPreferences, clearPreferences]);

  const isAdmin = profile?.role === 'admin';

  const signOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
      setProfile(null);
      clearWishlist();
      clearPreferences();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, refetch, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
