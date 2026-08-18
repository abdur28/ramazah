import { create } from 'zustand';
import { 
  addToWishlist as addToWishlistFirebase,
  removeFromWishlist as removeFromWishlistFirebase,
  getWishlist as getWishlistFirebase
} from '@/lib/products';
import { getUserOrders } from '@/lib/orders';
import { updateUserProfile, getUserProfile, updateUserEmail, updateUserPassword } from '@/lib/firebase/auth';
import type { Product, UserPreferences, Order } from '@/types/types';

interface DashboardState {
  // Wishlist state
  wishlist: string[];
  wishlistProducts: Product[];
  isLoadingWishlist: boolean;

  // Orders state
  orders: Order[];
  isLoadingOrders: boolean;
  ordersError: string | null;

  // Preferences state
  preferences: UserPreferences | null;
  isLoadingPreferences: boolean;
  isSavingPreferences: boolean;

  // Settings state
  isSavingProfile: boolean;
  isSavingAddress: boolean;
  isUpdatingPassword: boolean;

  // Wishlist actions
  loadWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (productId: string, userId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;

  // Orders actions
  fetchUserOrders: (userId: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  clearOrders: () => void;

  // Preferences actions
  loadPreferences: (userId: string) => Promise<void>;
  savePreferences: (userId: string, preferences: UserPreferences) => Promise<{ success: boolean; error?: string }>;
  updatePreferencesLocally: (preferences: Partial<UserPreferences>) => void;
  clearPreferences: () => void;

  // Settings actions
  updateProfile: (data: { displayName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (address: any) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
}

const defaultPreferences: UserPreferences = {
  emailNotifications: {
    orderUpdates: true,
    promotions: true,
    newArrivals: false,
    wishlistAlerts: true,
    newsletter: true,
  },
  currency: 'rub',
};

export const useDashboard = create<DashboardState>((set, get) => ({
  // Initial state
  wishlist: [],
  wishlistProducts: [],
  isLoadingWishlist: false,
  orders: [],
  isLoadingOrders: false,
  ordersError: null,
  preferences: null,
  isLoadingPreferences: false,
  isSavingPreferences: false,
  isSavingProfile: false,
  isSavingAddress: false,
  isUpdatingPassword: false,

  // ============ WISHLIST ACTIONS ============
  loadWishlist: async (userId: string) => {
    set({ isLoadingWishlist: true });
    
    try {
      const { products, error } = await getWishlistFirebase(userId);
      
      if (error) {
        console.error('Failed to load wishlist:', error);
        set({ isLoadingWishlist: false });
        return;
      }

      const productIds = products.map(p => p.id);
      
      set({ 
        wishlistProducts: products,
        wishlist: productIds,
        isLoadingWishlist: false 
      });
    } catch (error) {
      console.error('Load wishlist error:', error);
      set({ isLoadingWishlist: false });
    }
  },

  toggleWishlist: async (productId: string, userId: string) => {
    const { wishlist } = get();
    const isCurrentlyInWishlist = wishlist.includes(productId);

    if (isCurrentlyInWishlist) {
      set({ 
        wishlist: wishlist.filter(id => id !== productId),
        wishlistProducts: get().wishlistProducts.filter(p => p.id !== productId)
      });
    } else {
      set({ 
        wishlist: [...wishlist, productId] 
      });
    }

    try {
      if (isCurrentlyInWishlist) {
        const { error } = await removeFromWishlistFirebase(userId, productId);
        
        if (error) {
          set({ wishlist: [...wishlist, productId] });
          console.error('Failed to remove from wishlist:', error);
          return false;
        }
        
        return false;
      } else {
        const { error } = await addToWishlistFirebase(userId, productId);
        
        if (error) {
          set({ wishlist: wishlist.filter(id => id !== productId) });
          console.error('Failed to add to wishlist:', error);
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Toggle wishlist error:', error);
      set({ wishlist });
      return isCurrentlyInWishlist;
    }
  },

  isInWishlist: (productId: string) => {
    return get().wishlist.includes(productId);
  },

  clearWishlist: () => {
    set({ 
      wishlist: [],
      wishlistProducts: [],
      isLoadingWishlist: false 
    });
  },

  // ============ ORDERS ACTIONS ============
  fetchUserOrders: async (userId: string) => {
    set({ isLoadingOrders: true, ordersError: null });
    
    try {
      const { orders, error } = await getUserOrders(userId);
      
      if (error) {
        console.error('Failed to fetch orders:', error);
        set({ 
          isLoadingOrders: false,
          ordersError: error 
        });
        return;
      }

      set({ 
        orders: orders || [],
        isLoadingOrders: false,
        ordersError: null
      });
    } catch (error: any) {
      console.error('Fetch orders error:', error);
      set({ 
        isLoadingOrders: false,
        ordersError: error.message || 'Failed to load orders'
      });
    }
  },

  getOrderById: (orderId: string) => {
    return get().orders.find(order => order.id === orderId);
  },

  clearOrders: () => {
    set({ 
      orders: [],
      isLoadingOrders: false,
      ordersError: null
    });
  },

  // ============ PREFERENCES ACTIONS ============
  loadPreferences: async (userId: string) => {
    set({ isLoadingPreferences: true });
    
    try {
      const userProfile = await getUserProfile(userId);
      
      if (userProfile?.preferences) {
        set({ 
          preferences: userProfile.preferences as UserPreferences,
          isLoadingPreferences: false 
        });
      } else {
        set({ 
          preferences: defaultPreferences,
          isLoadingPreferences: false 
        });
      }
    } catch (error) {
      console.error('Load preferences error:', error);
      set({ 
        preferences: defaultPreferences,
        isLoadingPreferences: false 
      });
    }
  },

  savePreferences: async (userId: string, preferences: UserPreferences) => {
    set({ isSavingPreferences: true });
    
    try {
      const { error } = await updateUserProfile({
        preferences,
      });
      
      if (error) {
        console.error('Failed to save preferences:', error);
        set({ isSavingPreferences: false });
        return { success: false, error };
      }

      set({ 
        preferences,
        isSavingPreferences: false 
      });

      return { success: true };
    } catch (error: any) {
      console.error('Save preferences error:', error);
      set({ isSavingPreferences: false });
      return { success: false, error: error.message };
    }
  },

  updatePreferencesLocally: (partialPreferences: Partial<UserPreferences>) => {
    const { preferences } = get();
    if (preferences) {
      set({ 
        preferences: { ...preferences, ...partialPreferences } 
      });
    }
  },

  clearPreferences: () => {
    set({ 
      preferences: null,
      isLoadingPreferences: false,
      isSavingPreferences: false
    });
  },

  // ============ SETTINGS ACTIONS ============
  updateProfile: async (data: { displayName?: string; phone?: string }) => {
    set({ isSavingProfile: true });
    
    try {
      const { error } = await updateUserProfile(data);
      
      if (error) {
        set({ isSavingProfile: false });
        return { success: false, error };
      }

      set({ isSavingProfile: false });
      return { success: true };
    } catch (error: any) {
      set({ isSavingProfile: false });
      return { success: false, error: error.message };
    }
  },

  updateAddress: async (address: any) => {
    set({ isSavingAddress: true });
    
    try {
      const { error } = await updateUserProfile({ address });
      
      if (error) {
        set({ isSavingAddress: false });
        return { success: false, error };
      }

      set({ isSavingAddress: false });
      return { success: true };
    } catch (error: any) {
      set({ isSavingAddress: false });
      return { success: false, error: error.message };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isUpdatingPassword: true });
    
    try {
      const { error } = await updateUserPassword(newPassword);
      
      if (error) {
        set({ isUpdatingPassword: false });
        return { success: false, error };
      }

      set({ isUpdatingPassword: false });
      return { success: true };
    } catch (error: any) {
      set({ isUpdatingPassword: false });
      return { success: false, error: error.message };
    }
  },

  changeEmail: async (newEmail: string) => {
    set({ isSavingProfile: true });
    
    try {
      const { error } = await updateUserEmail(newEmail);
      
      if (error) {
        set({ isSavingProfile: false });
        return { success: false, error };
      }

      set({ isSavingProfile: false });
      return { success: true };
    } catch (error: any) {
      set({ isSavingProfile: false });
      return { success: false, error: error.message };
    }
  },
}));

// Helper hooks
export const useIsInWishlist = (productId: string) => {
  return useDashboard(state => state.isInWishlist(productId));
};

export const useWishlistCount = () => {
  return useDashboard(state => state.wishlist.length);
};

export const usePreferences = () => {
  return useDashboard(state => state.preferences);
};

export const useCurrency = () => {
  return useDashboard(state => state.preferences?.currency || 'rub');
};

export const useUserOrders = () => {
  return useDashboard(state => ({
    orders: state.orders,
    isLoading: state.isLoadingOrders,
    error: state.ordersError
  }));
};