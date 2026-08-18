import { create } from "zustand";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserProfile } from '@/types/types';
import { AdminUserDataStore, FetchOptions } from '@/types/admin';

/**
 * Utility function to format Firestore timestamps
 */
const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return new Date(timestamp).toISOString();
};

/**
 * Utility function to create error messages
 */
const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

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
        startAfter: startAfterDoc,
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;
      
      // Start building the query
      let baseQuery = query(collection(db, 'users'));
      
      // Apply filters if any
      if (filters.length > 0) {
        filters.forEach(filter => {
          baseQuery = query(baseQuery, where(filter.field, filter.operator, filter.value));
        });
      }
      
      // Apply ordering
      let orderedQuery = query(baseQuery, orderBy(orderByField, orderDirection));
      
      // Apply pagination
      let paginatedQuery;
      if (startAfterDoc || get().pagination.users.lastDoc) {
        const lastDoc = startAfterDoc || get().pagination.users.lastDoc;
        paginatedQuery = query(orderedQuery, startAfter(lastDoc), limit(limitCount));
      } else {
        paginatedQuery = query(orderedQuery, limit(limitCount));
      }
      
      // Execute the query
      const snapshot = await getDocs(paginatedQuery);
      
      // Extract data
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: formatFirestoreTimestamp(doc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(doc.data().updatedAt),
      } as UserProfile));
      
      // Check if there are more results
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      // Update state
      set(state => ({
        users: options.startAfter ? [...state.users, ...users] : users,
        loading: { ...state.loading, users: false },
        pagination: {
          ...state.pagination,
          users: {
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limitCount
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
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) return null;
      
      return {
        uid: userDoc.id,
        ...userDoc.data(),
        createdAt: formatFirestoreTimestamp(userDoc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(userDoc.data().updatedAt),
      } as UserProfile;
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
      const userRef = doc(db, 'users', userId);
      
      // Add updatedAt timestamp to the data
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updatedData);
      
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
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
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
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        // You might need to add a 'status' field to UserProfile type
        status,
        updatedAt: serverTimestamp()
      });
      
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
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });
      
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