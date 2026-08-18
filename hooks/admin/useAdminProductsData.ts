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
import { AdminProductDataStore, Product, ProductImage, FetchOptions } from '@/types/admin';

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
 * Utility function to generate slug from name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Remove undefined values from an object
 * Firebase doesn't support undefined values
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    });
    return cleaned;
  }
  
  return obj;
};

/**
 * Admin hook for product management
 */
const useAdminProductsData = create<AdminProductDataStore>((set, get) => ({
  // State
  products: [],
  
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
    collections: { lastDoc: null, hasMore: false },
  },
  
  // Reset methods
  resetProducts: () => set({ 
    products: [], 
    pagination: { 
      ...get().pagination, 
      products: { lastDoc: null, hasMore: false } 
    } 
  }),
  
  /**
   * Fetch products with optional pagination and filtering
   */
  fetchProducts: async (options: FetchOptions = {}) => {
    set(state => ({ 
      loading: { ...state.loading, products: true },
      error: { ...state.error, products: null } 
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
      let baseQuery = query(collection(db, 'products'));
      
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
      if (startAfterDoc || get().pagination.products.lastDoc) {
        const lastDoc = startAfterDoc || get().pagination.products.lastDoc;
        paginatedQuery = query(orderedQuery, startAfter(lastDoc), limit(limitCount));
      } else {
        paginatedQuery = query(orderedQuery, limit(limitCount));
      }
      
      // Execute the query
      const snapshot = await getDocs(paginatedQuery);
      
      // Extract data
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: formatFirestoreTimestamp(doc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(doc.data().updatedAt),
        publishedAt: doc.data().publishedAt ? formatFirestoreTimestamp(doc.data().publishedAt) : undefined,
      } as Product));
      
      // Check if there are more results
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      // Update state
      set(state => ({
        products: options.startAfter ? [...state.products, ...products] : products,
        loading: { ...state.loading, products: false },
        pagination: {
          ...state.pagination,
          products: {
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limitCount
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      set(state => ({
        loading: { ...state.loading, products: false },
        error: { ...state.error, products: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Get product by ID
   */
  getProductById: async (productId: string): Promise<Product | null> => {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      
      if (!productDoc.exists()) return null;
      
      return {
        id: productDoc.id,
        ...productDoc.data(),
        createdAt: formatFirestoreTimestamp(productDoc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(productDoc.data().updatedAt),
        publishedAt: productDoc.data().publishedAt ? formatFirestoreTimestamp(productDoc.data().publishedAt) : undefined,
      } as Product;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      set(state => ({
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      return null;
    }
  },
  
  /**
   * Create new product
   */
  createProduct: async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // Generate slug if not provided
      const slug = data.slug || generateSlug(data.name);
      
      // Check if slug already exists
      const existingQuery = query(
        collection(db, 'products'),
        where('slug', '==', slug)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        throw new Error('A product with this name already exists');
      }
      
      // Create the product and remove undefined values
      const productData = removeUndefined({
        ...data,
        slug,
        viewCount: 0,
        salesCount: 0,
      });
      
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Add to local state
      const newProduct: Product = {
        id: docRef.id,
        ...data,
        slug,
        viewCount: 0,
        salesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Product;
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        products: [newProduct, ...state.products]
      }));
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Update product
   */
  updateProduct: async (productId: string, data: Partial<Product>) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const productRef = doc(db, 'products', productId);
      
      // If name is being updated, regenerate slug
      if (data.name && !data.slug) {
        data.slug = generateSlug(data.name);
      }
      
      // Check if new slug conflicts with existing products
      if (data.slug) {
        const existingQuery = query(
          collection(db, 'products'),
          where('slug', '==', data.slug)
        );
        const existingDocs = await getDocs(existingQuery);
        
        // Check if any other product (not this one) has the same slug
        const conflict = existingDocs.docs.find(doc => doc.id !== productId);
        if (conflict) {
          throw new Error('A product with this name already exists');
        }
      }
      
      // Add updatedAt timestamp and remove undefined values
      const updatedData = removeUndefined({
        ...data,
      });
      
      // Only update if there's data to update
      if (Object.keys(updatedData).length > 1) { // More than just updatedAt
        await updateDoc(productRef, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });
      }
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      // Update state if product already exists in the store
      const existingProductIndex = get().products.findIndex(p => p.id === productId);
      if (existingProductIndex !== -1) {
        set(state => ({
          products: state.products.map((product, index) => 
            index === existingProductIndex 
              ? { ...product, ...data, updatedAt: new Date().toISOString() } 
              : product
          )
        }));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Delete product
   */
  deleteProduct: async (productId: string) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // Get product to access images
      const product = await get().getProductById(productId);
      
      if (product && product.images && product.images.length > 0) {
        // Delete all images from Cloudinary
        const deletePromises = product.images.map(img => 
          get().deleteProductImage(img.publicId)
        );
        await Promise.all(deletePromises).catch(err => {
          console.warn('Some images could not be deleted:', err);
        });
      }
      
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        // Remove the deleted product from the store
        products: state.products.filter(p => p.id !== productId)
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Upload product images to Cloudinary
   */
  uploadProductImages: async (files: File[]): Promise<ProductImage[]> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Call API route to upload images
      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      const result = await response.json();
      
      // Transform Cloudinary results to ProductImage format
      return result.images.map((img: any, index: number) => ({
        id: generateId(),
        publicId: img.publicId,
        url: img.url,
        secureUrl: img.secureUrl,
        altText: '',
        order: index,
        isPrimary: index === 0,
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  },
  
  /**
   * Delete product image from Cloudinary
   */
  deleteProductImage: async (publicId: string): Promise<void> => {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}));

export default useAdminProductsData;