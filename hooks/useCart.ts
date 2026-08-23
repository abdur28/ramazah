// hooks/useCart.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  getCart, 
  addToCart as addToCartFirebase,
  updateCartItemQuantity,
  removeFromCart as removeFromCartFirebase,
  clearCart as clearCartFirebase,
  syncCart,
  getProduct
} from '@/lib/products';
import { createOrder } from '@/lib/orders';
import type { CartItem, CheckoutData, CreateOrderData, CurrencyCode, DeliveryType } from '@/types/types';

interface CartState {
  // State
  items: CartItem[];
  isLoading: boolean;
  lastSynced: number | null;

  // Computed values (currency-agnostic)
  itemCount: number;

  // Actions
  loadCart: (userId?: string) => Promise<void>;
  addItem: (item: Omit<CartItem, 'id'>, userId?: string) => Promise<{ error: string | null }>;
  removeItem: (cartItemId: string, userId?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number, userId?: string) => Promise<void>;
  clearCart: (userId?: string) => Promise<void>;
  syncWithFirebase: (userId: string) => Promise<void>;
  removeDuplicates: () => void;
  /** `money` comes from Settings; a zustand store cannot read a React context. */
  checkout: (
    userId: string,
    checkoutData: CheckoutData,
    currency: CurrencyCode,
    money: { taxRate: number; standardShipping: number; freeShippingThreshold: number }
  ) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  
  // Internal helpers
  calculateItemCount: () => void;
}

// Helper function to remove undefined values from objects
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const cleaned = removeUndefined(value);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else {
        result[key] = value;
      }
    }
  }
  
  return result as Partial<T>;
};

// Helper function to compare cart items
const isSameCartItem = (item1: CartItem, item2: Omit<CartItem, 'id'>): boolean => {
  const sameProduct = item1.productId === item2.productId;
  const sameVariant = item1.variantId === item2.variantId;
  const sameColor = 
    (!item1.color && !item2.color) || 
    (item1.color?.name === item2.color?.name);
  const sameSize = item1.size === item2.size;
  
  return sameProduct && sameVariant && sameColor && sameSize;
};

// Helper function to deduplicate cart items
const deduplicateCartItems = (items: CartItem[]): CartItem[] => {
  const seen = new Map<string, CartItem>();
  
  items.forEach(item => {
    const colorKey = item.color?.name || 'no-color';
    const key = `${item.productId}-${item.variantId || 'no-variant'}-${item.size || 'no-size'}-${colorKey}`;
    const existing = seen.get(key);
    
    if (existing) {
      seen.set(key, {
        ...existing,
        quantity: Math.min(
          existing.quantity + item.quantity,
          item.maxQuantity
        )
      });
    } else {
      seen.set(key, item);
    }
  });
  
  return Array.from(seen.values());
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      isLoading: false,
      lastSynced: null,
      itemCount: 0,

      // Calculate item count (currency-agnostic)
      calculateItemCount: () => {
        const { items } = get();
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        set({ itemCount });
      },

      // Load cart from Firebase or use local storage
      loadCart: async (userId?: string) => {
        if (!userId) {
          const { items } = get();
          const deduplicatedItems = deduplicateCartItems(items);
          
          if (deduplicatedItems.length !== items.length) {
            set({ items: deduplicatedItems });
          }
          
          get().calculateItemCount();
          return;
        }

        set({ isLoading: true });
        try {
          const { items, error } = await getCart(userId);
          
          if (error) {
            console.error('Failed to load cart:', error);
            set({ isLoading: false });
            return;
          }

          const deduplicatedItems = deduplicateCartItems(items);

          set({ 
            items: deduplicatedItems, 
            lastSynced: Date.now(),
            isLoading: false 
          });
          get().calculateItemCount();
        } catch (error) {
          console.error('Failed to load cart:', error);
          set({ isLoading: false });
        }
      },

      // Add item to cart
      // Returns the failure rather than only logging it, so the button that
      // called it can tell the customer their item did not go in.
      addItem: async (newItem: Omit<CartItem, 'id'>, userId?: string) => {
        set({ isLoading: true });

        try {
          const sanitizedItem = removeUndefined(newItem) as Omit<CartItem, 'id'>;

          if (userId) {
            const { error } = await addToCartFirebase(userId, sanitizedItem);

            if (error) {
              console.error('Failed to add item to cart:', error);
              set({ isLoading: false });
              return { error };
            }

            await get().loadCart(userId);
            return { error: null };
          } else {
            const { items } = get();
            const existingIndex = items.findIndex(item => isSameCartItem(item, sanitizedItem));

            let updatedItems: CartItem[];
            
            if (existingIndex >= 0) {
              const existingItem = items[existingIndex];
              const newQuantity = Math.min(
                existingItem.quantity + sanitizedItem.quantity,
                sanitizedItem.maxQuantity
              );
              
              updatedItems = items.map((item, index) =>
                index === existingIndex
                  ? { ...item, quantity: newQuantity }
                  : item
              );
            } else {
              const tempId = `temp_${Date.now()}_${Math.random()}`;
              updatedItems = [...items, { ...sanitizedItem, id: tempId }];
            }

            set({ items: updatedItems, isLoading: false });
            get().calculateItemCount();
            return { error: null };
          }
        } catch (error: any) {
          console.error('Failed to add item:', error);
          set({ isLoading: false });
          return { error: error?.message ?? 'Failed to add item' };
        }
      },

      // Remove item from cart
      removeItem: async (cartItemId: string, userId?: string) => {
        set({ isLoading: true });

        try {
          if (userId) {
            const { error } = await removeFromCartFirebase(userId, cartItemId);
            
            if (error) {
              console.error('Failed to remove item:', error);
              set({ isLoading: false });
              return;
            }

            set(state => ({
              items: state.items.filter(item => item.id !== cartItemId),
              isLoading: false
            }));
          } else {
            set(state => ({
              items: state.items.filter(item => item.id !== cartItemId),
              isLoading: false
            }));
          }

          get().calculateItemCount();
        } catch (error) {
          console.error('Failed to remove item:', error);
          set({ isLoading: false });
        }
      },

      // Update item quantity
      updateQuantity: async (cartItemId: string, quantity: number, userId?: string) => {
        if (quantity < 1) {
          await get().removeItem(cartItemId, userId);
          return;
        }

        set({ isLoading: true });

        try {
          if (userId) {
            const { error } = await updateCartItemQuantity(userId, cartItemId, quantity);
            
            if (error) {
              console.error('Failed to update quantity:', error);
              set({ isLoading: false });
              return;
            }
          }

          set(state => ({
            items: state.items.map(item =>
              item.id === cartItemId
                ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
                : item
            ),
            isLoading: false
          }));

          get().calculateItemCount();
        } catch (error) {
          console.error('Failed to update quantity:', error);
          set({ isLoading: false });
        }
      },

      // Clear entire cart
      clearCart: async (userId?: string) => {
        set({ isLoading: true });

        try {
          if (userId) {
            const { error } = await clearCartFirebase(userId);
            
            if (error) {
              console.error('Failed to clear cart:', error);
              set({ isLoading: false });
              return;
            }
          }

          set({ 
            items: [], 
            isLoading: false,
            itemCount: 0,
          });
        } catch (error) {
          console.error('Failed to clear cart:', error);
          set({ isLoading: false });
        }
      },

      // Sync local cart with Firebase when user logs in
      syncWithFirebase: async (userId: string) => {
        const { items: localItems } = get();
        
        set({ isLoading: true });

        try {
          const { items: firebaseItems, error: loadError } = await getCart(userId);
          
          if (loadError) {
            console.error('Failed to load Firebase cart:', loadError);
            set({ isLoading: false });
            return;
          }

          if (localItems.length === 0) {
            set({ 
              items: firebaseItems, 
              lastSynced: Date.now(),
              isLoading: false 
            });
            get().calculateItemCount();
            return;
          }

          if (firebaseItems.length === 0) {
            const { error } = await syncCart(userId, localItems);
            
            if (error) {
              console.error('Failed to sync cart:', error);
              set({ isLoading: false });
              return;
            }

            await get().loadCart(userId);
            return;
          }

          const uniqueLocalItems = localItems.filter(localItem => 
            !firebaseItems.some(firebaseItem => isSameCartItem(firebaseItem, localItem))
          );

          if (uniqueLocalItems.length > 0) {
            await syncCart(userId, uniqueLocalItems);
          }

          await get().loadCart(userId);
        } catch (error) {
          console.error('Failed to sync cart:', error);
          set({ isLoading: false });
        }
      },

      // Manual deduplication
      removeDuplicates: () => {
        const { items } = get();
        const deduplicatedItems = deduplicateCartItems(items);
        
        if (deduplicatedItems.length !== items.length) {
          console.log(`Removed ${items.length - deduplicatedItems.length} duplicate items`);
          set({ items: deduplicatedItems });
          get().calculateItemCount();
        }
      },

      // Checkout function - verify prices and create order
      /**
       * `money` is passed in rather than imported.
       *
       * VAT, shipping and the free-shipping threshold are settings now, and this
       * is a zustand store — it cannot call the hook that reads them. The
       * checkout screen has them already, so they come down with the call.
       */
      checkout: async (
        userId: string,
        checkoutData: CheckoutData,
        currency: CurrencyCode,
        money: { taxRate: number; standardShipping: number; freeShippingThreshold: number }
      ) => {
        const { items } = get();
        
        if (items.length === 0) {
          return { success: false, error: 'Cart is empty' };
        }

        set({ isLoading: true });

        try {
          // Step 1: Verify prices with database
          const verifiedItems = [];
          
          for (const item of items) {
            // Fetch product from database
            const { product, error } = await getProduct(item.productId);
            
            if (error || !product) {
              set({ isLoading: false });
              return { 
                success: false, 
                error: `Product ${item.name} not found or unavailable` 
              };
            }

            // Get the correct price array (variant or product)
            let pricesArray = product.prices || [];
            if (item.variantId && product.variants) {
              const variant = product.variants.find(v => v.id === item.variantId);
              if (variant?.prices) {
                pricesArray = variant.prices;
              }
            }

            // Find price for current currency
            const priceObj = pricesArray.find(p => p.currency === currency);
            
            if (!priceObj) {
              set({ isLoading: false });
              return { 
                success: false, 
                error: `Price not available for ${item.name} in selected currency` 
              };
            }

            // Verify price matches
            const cartPrice = item.prices.find(p => p.currency === currency);
            if (!cartPrice || cartPrice.price !== priceObj.price) {
              set({ isLoading: false });
              return { 
                success: false, 
                error: `Price mismatch for ${item.name}. Please refresh your cart.` 
              };
            }

            // Check stock availability
            const availableStock = item.variantId 
              ? product.variants?.find(v => v.id === item.variantId)?.stockCount || 0
              : product.totalStock;

            if (availableStock < item.quantity) {
              set({ isLoading: false });
              return { 
                success: false, 
                error: `Insufficient stock for ${item.name}. Only ${availableStock} available.` 
              };
            }

            // Add verified item
            verifiedItems.push({
              id: item.id,
              productId: item.productId,
              ...(item.variantId ? { variantId: item.variantId } : {}),
              name: item.name,
              sku: item.sku,
              price: priceObj.price,
              currency: currency,
              quantity: item.quantity,
              ...(item.size ? { size: item.size } : {}),
              ...(item.color ? { color: item.color } : {}),
              imageUrl: item.image,
            });
          }

          // Step 2: Calculate totals
          const subtotal = verifiedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const tax = subtotal * money.taxRate;
          const shippingCost = checkoutData.deliveryType === 'delivery'
            ? (subtotal >= money.freeShippingThreshold ? 0 : money.standardShipping)
            : 0;
          const total = subtotal + tax + shippingCost;

          // Step 3: Create order
          const orderData = {
            userId,
            customerNotes: checkoutData.note,
            deliveryType: checkoutData.deliveryType,
            items: verifiedItems,
            currency,
            subtotal,
            tax,
            shippingCost,
            total,
            shippingAddress: checkoutData.shippingAddress,
            customerName: checkoutData.fullName,
            customerEmail: checkoutData.email,
            customerPhone: checkoutData.phone,
          } ;

          const { orderId, error: orderError } = await createOrder(orderData);

          if (orderError || !orderId) {
            set({ isLoading: false });
            return { 
              success: false, 
              error: orderError || 'Failed to create order' 
            };
          }

          // Step 4: Clear cart after successful order
          await get().clearCart(userId);

          set({ isLoading: false });
          return { success: true, orderId };

        } catch (error: any) {
          console.error('Checkout error:', error);
          set({ isLoading: false });
          return { 
            success: false, 
            error: error.message || 'Checkout failed' 
          };
        }
      },
    }),
    {
      name: 'ramazah-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const deduplicatedItems = deduplicateCartItems(state.items);
          if (deduplicatedItems.length !== state.items.length) {
            console.log('Removed duplicates during rehydration');
            state.items = deduplicatedItems;
          }
          state.calculateItemCount();
        }
      },
    }
  )
);

// Helper hook to get cart count
export const useCartCount = () => useCart(state => state.itemCount);

// Helper hook to check if item is in cart
export const useIsInCart = (productId: string, variantId?: string) => {
  return useCart(state => 
    state.items.some(
      item => item.productId === productId && 
              (!variantId || item.variantId === variantId)
    )
  );
};