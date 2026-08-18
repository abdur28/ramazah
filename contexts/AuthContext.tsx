'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getUserProfile, signOut as firebaseSignOut } from '@/lib/firebase/auth';
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
  
  // Access dashboard store
  const { loadWishlist, clearWishlist, loadPreferences, clearPreferences } = useDashboard();

  // Refetch user profile
  const refetch = useCallback(async (user: User) => {
    if (user) {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      
      // Reload wishlist and preferences
      await loadWishlist(user.uid);
      await loadPreferences(user.uid);
    }
  }, [user, loadWishlist, loadPreferences]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);

      if (user) {
        // Fetch user profile from Firestore
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        
        // Load user's wishlist and preferences
        await loadWishlist(user.uid);
        await loadPreferences(user.uid);
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
      // Sign out from Firebase (this also calls clearAuthCookie internally)
      await firebaseSignOut();
      
      // Clear local state
      setUser(null);
      setProfile(null);
      
      // Clear wishlist and preferences
      clearWishlist();
      clearPreferences();
      
      // Redirect to home
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