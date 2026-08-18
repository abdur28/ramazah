import { create } from "zustand";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
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
import { AdminCollectionDataStore, Collection, BannerImage, FetchOptions } from '@/types/admin';

/**
 * Utility functions
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

const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Admin hook for collection management
 */
const useAdminCollectionsData = create<AdminCollectionDataStore>((set, get) => ({
  // State
  collections: [],
  
  // Loading, Error, and Pagination state
  loading: {
    users: false,
    orders: false,
    products: false,
    categories: false,
    collections: false,
    analytics: false,
    adminAction: false
  },
  error: {
    users: null,
    orders: null,
    products: null,
    categories: null,
    collections: null,
    analytics: null,
    adminAction: null
  },
  pagination: {
    users: { lastDoc: null, hasMore: false },
    orders: { lastDoc: null, hasMore: false },
    products: { lastDoc: null, hasMore: false },
    categories: { lastDoc: null, hasMore: false },
    collections: { lastDoc: null, hasMore: false }
  },
  
  // Reset methods
  resetCollections: () => set({ 
    collections: [], 
    pagination: { 
      ...get().pagination, 
      collections: { lastDoc: null, hasMore: false } 
    } 
  }),
  
  /**
   * Fetch collections with optional pagination and filtering
   */
  fetchCollections: async (options: FetchOptions = {}) => {
    set(state => ({ 
      loading: { ...state.loading, collections: true },
      error: { ...state.error, collections: null } 
    }));
    
    try {
      const {
        limit: limitCount = 50,
        startAfter: startAfterDoc,
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;
      
      let baseQuery = query(collection(db, 'collections'));
      
      if (filters.length > 0) {
        filters.forEach(filter => {
          baseQuery = query(baseQuery, where(filter.field, filter.operator, filter.value));
        });
      }
      
      let orderedQuery = query(baseQuery, orderBy(orderByField, orderDirection));
      
      let paginatedQuery;
      if (startAfterDoc || get().pagination.collections.lastDoc) {
        const lastDoc = startAfterDoc || get().pagination.collections.lastDoc;
        paginatedQuery = query(orderedQuery, startAfter(lastDoc), limit(limitCount));
      } else {
        paginatedQuery = query(orderedQuery, limit(limitCount));
      }
      
      const snapshot = await getDocs(paginatedQuery);
      
      const collections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: formatFirestoreTimestamp(doc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(doc.data().updatedAt),
      } as Collection));
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      set(state => ({
        collections: options.startAfter ? [...state.collections, ...collections] : collections,
        loading: { ...state.loading, collections: false },
        pagination: {
          ...state.pagination,
          collections: {
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limitCount
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching collections:', error);
      set(state => ({
        loading: { ...state.loading, collections: false },
        error: { ...state.error, collections: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Get collection by ID
   */
  getCollectionById: async (collectionId: string): Promise<Collection | null> => {
    try {
      const collectionDoc = await getDoc(doc(db, 'collections', collectionId));
      
      if (!collectionDoc.exists()) return null;
      
      return {
        id: collectionDoc.id,
        ...collectionDoc.data(),
        createdAt: formatFirestoreTimestamp(collectionDoc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(collectionDoc.data().updatedAt),
      } as Collection;
    } catch (error) {
      console.error('Error getting collection by ID:', error);
      set(state => ({
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      return null;
    }
  },
  
  /**
   * Create new collection
   */
  createCollection: async (data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const slug = data.slug || generateSlug(data.name);
      
      // Check if slug already exists
      const existingQuery = query(
        collection(db, 'collections'),
        where('slug', '==', slug)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        throw new Error('A collection with this name already exists');
      }
      
      const collectionData = {
        ...data,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'collections'), collectionData);
      
      const newCollection: Collection = {
        id: docRef.id,
        ...data,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        collections: [newCollection, ...state.collections]
      }));
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating collection:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Update collection
   */
  updateCollection: async (collectionId: string, data: Partial<Collection>) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const collectionRef = doc(db, 'collections', collectionId);
      
      if (data.name && !data.slug) {
        data.slug = generateSlug(data.name);
      }
      
      if (data.slug) {
        const existingQuery = query(
          collection(db, 'collections'),
          where('slug', '==', data.slug)
        );
        const existingDocs = await getDocs(existingQuery);
        
        const conflict = existingDocs.docs.find(doc => doc.id !== collectionId);
        if (conflict) {
          throw new Error('A collection with this name already exists');
        }
      }
      
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(collectionRef, updatedData);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      const existingCollectionIndex = get().collections.findIndex(c => c.id === collectionId);
      if (existingCollectionIndex !== -1) {
        set(state => ({
          collections: state.collections.map((coll, index) => 
            index === existingCollectionIndex 
              ? { ...coll, ...data, updatedAt: new Date().toISOString() } 
              : coll
          )
        }));
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Delete collection
   */
  deleteCollection: async (collectionId: string) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // Get collection to access banner image
      const coll = await get().getCollectionById(collectionId);
      
      if (coll && coll.bannerImage) {
        // Delete banner image from Cloudinary
        await get().deleteBannerImage(coll.bannerImage.publicId).catch(err => {
          console.warn('Could not delete banner image:', err);
        });
      }
      
      const collectionRef = doc(db, 'collections', collectionId);
      await deleteDoc(collectionRef);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        collections: state.collections.filter(c => c.id !== collectionId)
      }));
    } catch (error) {
      console.error('Error deleting collection:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Upload banner image to Cloudinary
   */
  uploadBannerImage: async (file: File): Promise<BannerImage> => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      
      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload banner image');
      }
      
      const result = await response.json();
      const img = result.images[0];
      
      return {
        id: generateId(),
        publicId: img.publicId,
        url: img.url,
        secureUrl: img.secureUrl,
        altText: '',
      };
    } catch (error) {
      console.error('Error uploading banner image:', error);
      throw error;
    }
  },
  
  /**
   * Delete banner image from Cloudinary
   */
  deleteBannerImage: async (publicId: string): Promise<void> => {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete banner image');
      }
    } catch (error) {
      console.error('Error deleting banner image:', error);
      throw error;
    }
  }
}));

export default useAdminCollectionsData;