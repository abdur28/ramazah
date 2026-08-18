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
import { AdminCategoryDataStore, FetchOptions } from '@/types/admin';
import { Category } from "@/types/types";

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
 * Admin hook for category management with path-based structure
 */
const useAdminCategoriesData = create<AdminCategoryDataStore>((set, get) => ({
  // State
  categories: [],
  
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
  resetCategories: () => set({ 
    categories: [], 
    pagination: { 
      ...get().pagination, 
      categories: { lastDoc: null, hasMore: false } 
    } 
  }),
  
  /**
   * Fetch categories with optional pagination and filtering
   */
  fetchCategories: async (options: FetchOptions = {}) => {
    set(state => ({ 
      loading: { ...state.loading, categories: true },
      error: { ...state.error, categories: null } 
    }));
    
    try {
      const {
        limit: limitCount = 50,
        startAfter: startAfterDoc,
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;
      
      let baseQuery = query(collection(db, 'categories'));
      
      if (filters.length > 0) {
        filters.forEach(filter => {
          baseQuery = query(baseQuery, where(filter.field, filter.operator, filter.value));
        });
      }
      
      let orderedQuery = query(baseQuery, orderBy(orderByField, orderDirection));
      
      let paginatedQuery;
      if (startAfterDoc || get().pagination.categories.lastDoc) {
        const lastDoc = startAfterDoc || get().pagination.categories.lastDoc;
        paginatedQuery = query(orderedQuery, startAfter(lastDoc), limit(limitCount));
      } else {
        paginatedQuery = query(orderedQuery, limit(limitCount));
      }
      
      const snapshot = await getDocs(paginatedQuery);
      
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: formatFirestoreTimestamp(doc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(doc.data().updatedAt),
      } as Category));
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      set(state => ({
        categories: options.startAfter ? [...state.categories, ...categories] : categories,
        loading: { ...state.loading, categories: false },
        pagination: {
          ...state.pagination,
          categories: {
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limitCount
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      set(state => ({
        loading: { ...state.loading, categories: false },
        error: { ...state.error, categories: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Get category by ID
   */
  getCategoryById: async (categoryId: string): Promise<Category | null> => {
    try {
      const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
      
      if (!categoryDoc.exists()) return null;
      
      return {
        id: categoryDoc.id,
        ...categoryDoc.data(),
        createdAt: formatFirestoreTimestamp(categoryDoc.data().createdAt),
        updatedAt: formatFirestoreTimestamp(categoryDoc.data().updatedAt),
      } as Category;
    } catch (error) {
      console.error('Error getting category by ID:', error);
      set(state => ({
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      return null;
    }
  },
  
  /**
   * Create new category
   * @param data - Category data
   * @param parentId - Optional parent category ID (if creating subcategory)
   */
  createCategory: async (
    data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>, 
    parentId?: string
  ): Promise<string> => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // Generate slug if not provided
      const slug = data.slug || generateSlug(data.name);
      
      let path: string;
      
      if (parentId) {
        // Creating a subcategory - find parent to build path
        const parentCategory = await get().getCategoryById(parentId);
        
        if (!parentCategory) {
          throw new Error('Parent category not found');
        }
        
        // Build path: parentPath/newSlug
        path = `${parentCategory.path}/${slug}`;
      } else {
        // Top-level category - path equals slug
        path = slug;
      }
      
      // Check if category with this path already exists
      const existingQuery = query(
        collection(db, 'categories'),
        where('path', '==', path)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        throw new Error('A category with this path already exists');
      }
      
      // Create the category
      const categoryData = {
        name: data.name,
        slug,
        path,
        description: data.description || '',
        ...(data.subtitle ? { subtitle: data.subtitle } : {}),
        ...(data.bannerImage ? { bannerImage: data.bannerImage } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'categories'), categoryData);
      
      // Add to local state
      const newCategory: Category = {
        id: docRef.id,
        name: data.name,
        slug,
        path,
        description: data.description || '',
        ...(data.subtitle ? { subtitle: data.subtitle } : {}),
        ...(data.bannerImage ? { bannerImage: data.bannerImage } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        categories: [newCategory, ...state.categories]
      }));
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating category:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Update category
   */
  updateCategory: async (
    categoryId: string, 
    data: Partial<Category>,
    parentId?: string
  ) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      const categoryDoc = await getDoc(categoryRef);
      
      if (!categoryDoc.exists()) {
        throw new Error('Category not found');
      }
      
      const currentCategory = categoryDoc.data() as Category;
      
      // If slug is being updated, regenerate path
      let updatedPath = currentCategory.path;
      if (data.slug && data.slug !== currentCategory.slug) {
        const pathParts = currentCategory.path.split('/');
        pathParts[pathParts.length - 1] = data.slug;
        updatedPath = pathParts.join('/');
        
        // Check if new path already exists
        const existingQuery = query(
          collection(db, 'categories'),
          where('path', '==', updatedPath)
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty && existingDocs.docs[0].id !== categoryId) {
          throw new Error('A category with this path already exists');
        }
        
        // Update path in data
        data.path = updatedPath;
      }
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(categoryRef, updatedData);
      
      // Update all child categories' paths if path changed
      if (data.path && data.path !== currentCategory.path) {
        const childrenQuery = query(
          collection(db, 'categories'),
          where('path', '>=', currentCategory.path + '/'),
          where('path', '<', currentCategory.path + '0')
        );
        const childrenSnapshot = await getDocs(childrenQuery);
        
        for (const childDoc of childrenSnapshot.docs) {
          const childData = childDoc.data();
          const newChildPath = childData.path.replace(currentCategory.path, data.path);
          await updateDoc(childDoc.ref, { 
            path: newChildPath,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        categories: state.categories.map(category =>
          category.id === categoryId
            ? { ...category, ...data, updatedAt: new Date().toISOString() }
            : category
        )
      }));
    } catch (error) {
      console.error('Error updating category:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Delete category
   * Also deletes all subcategories
   */
  deleteCategory: async (categoryId: string, parentId?: string) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      const categoryDoc = await getDoc(categoryRef);
      
      if (!categoryDoc.exists()) {
        throw new Error('Category not found');
      }
      
      const category = categoryDoc.data() as Category;
      
      // Delete all subcategories (categories with path starting with this category's path)
      const childrenQuery = query(
        collection(db, 'categories'),
        where('path', '>=', category.path + '/'),
        where('path', '<', category.path + '0')
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      
      // Delete children first
      for (const childDoc of childrenSnapshot.docs) {
        await deleteDoc(childDoc.ref);
      }
      
      // Delete the category itself
      await deleteDoc(categoryRef);
      
      // Update local state
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        categories: state.categories.filter(c => 
          c.id !== categoryId && !c.path.startsWith(category.path + '/')
        )
      }));
    } catch (error) {
      console.error('Error deleting category:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  }
}));

export default useAdminCategoriesData;