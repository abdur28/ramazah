import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/types';
import { AdminUserDataStore, FetchOptions } from '@/types/admin';
import { describeError } from '@/lib/admin/errors';

const supabase = () => createClient();

/** profiles row -> UserProfile */
const mapUser = (row: any): UserProfile => ({
  uid: row.id,
  email: row.email,
  displayName: row.display_name ?? undefined,
  photoURL: row.photo_url ?? undefined,
  phone: row.phone ?? undefined,
  role: row.role,
  status: row.status,
  emailOptIn: row.email_opt_in,
  preferences: row.preferences ?? undefined,
  emailVerified: true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** UserProfile field names -> profiles column names */
const toColumns = (data: Partial<UserProfile>) => {
  const patch: Record<string, any> = {};
  if (data.displayName !== undefined) patch.display_name = data.displayName;
  if (data.photoURL !== undefined)    patch.photo_url    = data.photoURL;
  if (data.phone !== undefined)       patch.phone        = data.phone;
  if (data.emailOptIn !== undefined)  patch.email_opt_in = data.emailOptIn;
  if (data.preferences !== undefined) patch.preferences  = data.preferences;
  return patch;
};

/**
 * Utility function to create error messages
 */
/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

/**
 * Admin hook for user management
 */
const useAdminUsersData = create<AdminUserDataStore>((set, get) => ({
  // State
  users: [],
  
  // Loading, Error, and Pagination state
  loading: {
    users: false,
    orders: false,
    products: false,
    analytics: false,
    adminAction: false,
    collections: false,
    categories: false
  },
  error: {
    users: null,
    orders: null,
    products: null,
    analytics: null,
    adminAction: null,
    collections: null,
    categories: null
  },
  pagination: {
    users: { lastDoc: null, hasMore: false },
    orders: { lastDoc: null, hasMore: false },
    products: { lastDoc: null, hasMore: false },
    categories: { lastDoc: null, hasMore: false },
    collections: { lastDoc: null, hasMore: false },
  },
  
  // Reset methods
  resetUsers: () => set({ 
    users: [], 
    pagination: { 
      ...get().pagination, 
      users: { lastDoc: null, hasMore: false } 
    } 
  }),
  
  /**
   * Fetch users with optional pagination and filtering
   */
  fetchUsers: async (options: FetchOptions = {}) => {
    set(state => ({ 
      loading: { ...state.loading, users: true },
      error: { ...state.error, users: null } 
    }));
    
    try {
      const {
        limit: limitCount = 20,
        startAfter: startAfterOffset,
        filters = [],
        orderByField = 'created_at',
        orderDirection = 'desc',
      } = options;

      const offset = (startAfterOffset as number) ?? 0;
      const column = orderByField === 'createdAt' ? 'created_at' : orderByField;

      let q = supabase().from('profiles').select('*');
      for (const f of filters) {
        q = q.eq(f.field === 'role' ? 'role' : f.field, f.value);
      }

      const { data, error } = await q
        .order(column, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limitCount - 1);

      if (error) throw new Error(error.message);

      const users = (data ?? []).map(mapUser);

      set(state => ({
        users: offset > 0 ? [...state.users, ...users] : users,
        loading: { ...state.loading, users: false },
        pagination: {
          ...state.pagination,
          users: {
            lastDoc: offset + users.length,
            hasMore: users.length === limitCount
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      set(state => ({
        loading: { ...state.loading, users: false },
        error: { ...state.error, users: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Get user by ID
   */
  getUserById: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase()
        .from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapUser(data) : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      set(state => ({
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      return null;
    }
  },
  
  /**
   * Update user
   */
  updateUser: async (userId: string, data: Partial<UserProfile>) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // role and status are column-protected; they go through their own RPCs below.
      const patch = toColumns(data);
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase().from('profiles').update(patch).eq('id', userId);
        if (error) throw new Error(error.message);
      }
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      // Update state if user already exists in the store
      const existingUserIndex = get().users.findIndex(u => u.uid === userId);
      if (existingUserIndex !== -1) {
        set(state => ({
          users: state.users.map((user, index) => 
            index === existingUserIndex 
              ? { ...user, ...data, updatedAt: new Date().toISOString() } 
              : user
          )
        }));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Delete user (permanently remove from database)
   */
  deleteUser: async (userId: string) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to delete user');
      }
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        // Remove the deleted user from the store
        users: state.users.filter(u => u.uid !== userId)
      }));
    } catch (error) {
      console.error('Error deleting user:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Toggle user status (active/inactive) - soft delete approach
   */
  toggleUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const { error } = await supabase().rpc('set_user_status', {
        p_user: userId, p_status: status
      });
      if (error) throw new Error(error.message);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        // Update user in the store if it exists
        users: state.users.map(user => 
          user.uid === userId 
            ? { ...user, updatedAt: new Date().toISOString() } 
            : user
        )
      }));
    } catch (error) {
      console.error('Error toggling user status:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Assign user role (user/admin)
   */
  assignUserRole: async (userId: string, role: 'user' | 'admin') => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const { error } = await supabase().rpc('set_user_role', {
        p_user: userId, p_role: role
      });
      if (error) throw new Error(error.message);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      // Update the user in the store if it exists
      const existingUserIndex = get().users.findIndex(u => u.uid === userId);
      if (existingUserIndex !== -1) {
        set(state => ({
          users: state.users.map((user, index) => {
            if (index === existingUserIndex) {
              return {
                ...user,
                role,
                updatedAt: new Date().toISOString()
              };
            }
            return user;
          })
        }));
      }
    } catch (error) {
      console.error('Error assigning user role:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  }
}));

export default useAdminUsersData;