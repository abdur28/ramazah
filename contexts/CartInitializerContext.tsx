'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

/**
 * CartInitializer - Handles cart initialization and syncing
 * Should be included once in the app layout
 */
export default function CartInitializer() {
  const { user, loading } = useAuth();
  const { loadCart, syncWithFirebase, items } = useCart();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    const initializeCart = async () => {
      if (user) {
        // User is logged in
        if (!hasSynced.current) {
          // First time sync after login
          await syncWithFirebase(user.id);
          hasSynced.current = true;
          
          // Clear localStorage after successful sync to prevent duplicates
          // The persist middleware will restore from the Zustand state
          localStorage.removeItem('ramazah-cart');
        } else {
          // Already synced, just reload from Firebase
          await loadCart(user.id);
        }
      } else {
        // Guest user - load from localStorage
        loadCart();
        hasSynced.current = false;
      }
    };

    initializeCart();
  }, [user, loading]);

  // This component doesn't render anything
  return null;
}