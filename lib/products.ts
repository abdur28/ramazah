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
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase/config';
import type { Product, CartItem, ProductFilters, PaginationParams, Category, Collection } from '@/types/types';

// ============ HELPER FUNCTIONS ============

const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result as Partial<T>;
};

/**
 * Convert path with slashes to display path with " > "
 * Example: "clothings/hood-wears/hoodies" -> "Clothings > Hood Wears > Hoodies"
 */
const pathToDisplayPath = (path: string): string => {
  return path
    .split('/')
    .map(segment => 
      segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' > ');
};

/**
 * Convert display path to slug path
 * Example: "Clothings > Hood Wears > Hoodies" -> "clothings/hood-wears/hoodies"
 */
const displayPathToPath = (displayPath: string): string => {
  return displayPath
    .split(' > ')
    .map(segment => segment.toLowerCase().replace(/\s+/g, '-'))
    .join('/');
};

// ============ CATEGORY OPERATIONS ============

/**
 * Get all categories
 */
export async function getAllCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];

    return { categories, error: null };
  } catch (error: any) {
    console.error('Get all categories error:', error);
    return { categories: [], error: error.message };
  }
}

/**
 * Get category by path (with slashes)
 * Example: "clothings/hood-wears/hoodies"
 */
export async function getCategoryByPath(path: string) {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('path', '==', path), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return {
        category: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Category,
        error: null,
      };
    }

    return { category: null, error: 'Category not found' };
  } catch (error: any) {
    console.error('Get category by path error:', error);
    return { category: null, error: error.message };
  }
}

/**
 * Get category by slug (single level)
 */
export async function getCategoryBySlug(slug: string) {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return {
        category: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Category,
        error: null,
      };
    }

    return { category: null, error: 'Category not found' };
  } catch (error: any) {
    console.error('Get category by slug error:', error);
    return { category: null, error: error.message };
  }
}

/**
 * Get products by category path
 * Converts slash path to display path for product matching
 * Example: "clothings/hood-wears/hoodies" -> matches products with categoryPath "Clothings > Hood Wears > Hoodies"
 */
export async function getProductsByCategoryPath(categoryPath: string) {
  try {
    // Convert slash path to display path for product query
    const displayPath = pathToDisplayPath(categoryPath);
    
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('categoryPath', '==', displayPath),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    return { products, error: null };
  } catch (error: any) {
    console.error('Get products by category path error:', error);
    return { products: [], error: error.message };
  }
}

/**
 * Get products by category slug
 */
export async function getProductsByCategorySlug(slug: string) {
  const { category } = await getCategoryBySlug(slug);
  
  if (!category) {
    return { products: [], error: 'Category not found' };
  }

  return getProductsByCategoryPath(category.path);
}

/**
 * Get category hierarchy
 */
export async function getCategoryHierarchy(categoryPath: string) {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    const allCategories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];

    // Find current category
    const currentCategory = allCategories.find(cat => cat.path === categoryPath);
    
    if (!currentCategory) {
      return { parent: null, current: null, children: [], error: 'Category not found' };
    }

    // Find parent (one level up)
    const pathParts = categoryPath.split('/');
    const parentPath = pathParts.slice(0, -1).join('/');
    const parent = parentPath ? allCategories.find(cat => cat.path === parentPath) : null;

    // Find children (one level down)
    const children = allCategories.filter(cat => {
      const catParts = cat.path.split('/');
      return catParts.length === pathParts.length + 1 && 
             cat.path.startsWith(categoryPath + '/');
    });

    return { 
      parent: parent || null, 
      current: currentCategory, 
      children, 
      error: null 
    };
  } catch (error: any) {
    console.error('Get category hierarchy error:', error);
    return { parent: null, current: null, children: [], error: error.message };
  }
}

// ============ COLLECTION OPERATIONS ============

export async function getCollectionBySlug(slug: string) {
  try {
    const collectionsRef = collection(db, 'collections');
    const q = query(collectionsRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return {
        collection: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Collection,
        error: null,
      };
    }

    return { collection: null, error: 'Collection not found' };
  } catch (error: any) {
    console.error('Get collection by slug error:', error);
    return { collection: null, error: error.message };
  }
}

export async function getProductsByCollectionSlug(slug: string) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('collectionSlug', '==', slug),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    return { products, error: null };
  } catch (error: any) {
    console.error('Get products by collection slug error:', error);
    return { products: [], error: error.message };
  }
}

// ============ PRODUCT OPERATIONS ============

export async function getProducts(
  filters?: ProductFilters,
  pagination?: PaginationParams
) {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef);

    if (filters?.categoryPath) {
      q = query(q, where('categoryPath', '==', filters.categoryPath));
    }
    if (filters?.itemType) {
      q = query(q, where('itemType', '==', filters.itemType));
    }
    if (filters?.collection) {
      q = query(q, where('collectionSlug', '==', filters.collection));
    }
    if (filters?.inStock !== undefined) {
      q = query(q, where('inStock', '==', filters.inStock));
    }
    if (filters?.isNew) {
      q = query(q, where('isNew', '==', true));
    }
    if (filters?.isFeatured) {
      q = query(q, where('isFeatured', '==', true));
    }
    if (filters?.isBestseller) {
      q = query(q, where('isBestseller', '==', true));
    }

    if (pagination?.orderBy) {
      q = query(q, orderBy(pagination.orderBy, pagination.orderDirection || 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    if (pagination?.limit) {
      q = query(q, limit(pagination.limit));
    }
    if (pagination?.startAfter) {
      q = query(q, startAfter(pagination.startAfter));
    }

    const snapshot = await getDocs(q);
    let products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    if (filters?.minPrice !== undefined) {
      products = products.filter((p) => {
        const price = p.prices?.[0]?.price || 0;
        return price >= filters.minPrice!;
      });
    }
    if (filters?.maxPrice !== undefined) {
      products = products.filter((p) => {
        const price = p.prices?.[0]?.price || 0;
        return price <= filters.maxPrice!;
      });
    }
    if (filters?.colors && filters.colors.length > 0) {
      products = products.filter((p) =>
        filters.colors!.some((color) => 
          p.colors?.some(c => c.name === color)
        )
      );
    }
    if (filters?.sizes && filters.sizes.length > 0) {
      products = products.filter((p) =>
        filters.sizes!.some((size) => p.sizes?.includes(size))
      );
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return { products, error: null, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  } catch (error: any) {
    console.error('Get products error:', error);
    return { products: [], error: error.message, lastDoc: null };
  }
}

export async function getProduct(productId: string) {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        viewCount: increment(1),
      });

      return {
        product: { id: docSnap.id, ...docSnap.data() } as Product,
        error: null,
      };
    }

    return { product: null, error: 'Product not found' };
  } catch (error: any) {
    console.error('Get product error:', error);
    return { product: null, error: error.message };
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];

      await updateDoc(docSnap.ref, {
        viewCount: increment(1),
      });

      return {
        product: { id: docSnap.id, ...docSnap.data() } as Product,
        error: null,
      };
    }

    return { product: null, error: 'Product not found' };
  } catch (error: any) {
    console.error('Get product by slug error:', error);
    return { product: null, error: error.message };
  }
}

export async function getProductsByIds(productIds: string[]) {
  try {
    if (productIds.length === 0) {
      return { products: [], error: null };
    }

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('__name__', 'in', productIds));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

    return { products, error: null };
  } catch (error: any) {
    console.error('Get products by ids error:', error);
    return { products: [], error: error.message };
  }
}

export async function getFeaturedProducts(limitCount: number = 6) {
  return getProducts({ isFeatured: true }, { limit: limitCount });
}

export async function getNewArrivals(limitCount: number = 8) {
  return getProducts({ isNew: true }, { limit: limitCount, orderBy: 'createdAt' });
}

export async function getBestsellers(limitCount: number = 8) {
  return getProducts(
    { isBestseller: true },
    { limit: limitCount, orderBy: 'salesCount' }
  );
}

// ============ CART OPERATIONS ============

export async function getCart(userId: string) {
  try {
    const cartRef = collection(db, 'users', userId, 'cart');
    const snapshot = await getDocs(cartRef);

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CartItem[];

    return { items, error: null };
  } catch (error: any) {
    console.error('Get cart error:', error);
    return { items: [], error: error.message };
  }
}

export async function addToCart(userId: string, item: Omit<CartItem, 'id'>) {
  try {
    const cartRef = collection(db, 'users', userId, 'cart');
    const sanitizedItem = removeUndefined(item);

    const q = query(
      cartRef,
      where('productId', '==', sanitizedItem.productId),
      where('variantId', '==', sanitizedItem.variantId || null)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingItem = existingDoc.data() as CartItem;
      const newQuantity = Math.min(
        existingItem.quantity + (sanitizedItem.quantity || 1),
        sanitizedItem.maxQuantity || 999
      );

      await updateDoc(existingDoc.ref, {
        quantity: newQuantity,
      });

      return { cartItemId: existingDoc.id, error: null };
    } else {
      const docRef = await addDoc(cartRef, sanitizedItem);
      return { cartItemId: docRef.id, error: null };
    }
  } catch (error: any) {
    console.error('Add to cart error:', error);
    return { cartItemId: null, error: error.message };
  }
}

export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  try {
    const cartItemRef = doc(db, 'users', userId, 'cart', cartItemId);
    await updateDoc(cartItemRef, { quantity });
    return { error: null };
  } catch (error: any) {
    console.error('Update cart item error:', error);
    return { error: error.message };
  }
}

export async function removeFromCart(userId: string, cartItemId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'cart', cartItemId));
    return { error: null };
  } catch (error: any) {
    console.error('Remove from cart error:', error);
    return { error: error.message };
  }
}

export async function clearCart(userId: string) {
  try {
    const cartRef = collection(db, 'users', userId, 'cart');
    const snapshot = await getDocs(cartRef);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Clear cart error:', error);
    return { error: error.message };
  }
}

export async function syncCart(userId: string, localCartItems: CartItem[]) {
  try {
    const batch = writeBatch(db);
    const cartRef = collection(db, 'users', userId, 'cart');

    for (const item of localCartItems) {
      const { id, ...itemData } = item;
      const sanitizedData = removeUndefined(itemData);
      const docRef = doc(cartRef);
      batch.set(docRef, sanitizedData);
    }

    await batch.commit();
    return { error: null };
  } catch (error: any) {
    console.error('Sync cart error:', error);
    return { error: error.message };
  }
}

// ============ WISHLIST OPERATIONS ============

export async function addToWishlist(userId: string, productId: string) {
  try {
    const wishlistRef = collection(db, 'users', userId, 'wishlist');
    await addDoc(wishlistRef, {
      productId,
      addedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: any) {
    console.error('Add to wishlist error:', error);
    return { error: error.message };
  }
}

export async function removeFromWishlist(userId: string, productId: string) {
  try {
    const wishlistRef = collection(db, 'users', userId, 'wishlist');
    const q = query(wishlistRef, where('productId', '==', productId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }

    return { error: null };
  } catch (error: any) {
    console.error('Remove from wishlist error:', error);
    return { error: error.message };
  }
}

export async function getWishlist(userId: string) {
  try {
    const wishlistRef = collection(db, 'users', userId, 'wishlist');
    const snapshot = await getDocs(wishlistRef);

    const productIds = snapshot.docs.map((doc) => doc.data().productId);

    if (productIds.length === 0) {
      return { products: [], error: null };
    }

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('__name__', 'in', productIds));
    const productsSnapshot = await getDocs(q);

    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    return { products, error: null };
  } catch (error: any) {
    console.error('Get wishlist error:', error);
    return { products: [], error: error.message };
  }
}

// Export helper functions for use elsewhere
export { pathToDisplayPath, displayPathToPath };