import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from '@/constants';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { user } = useAuth();
  const {
    items,
    itemCount,
    isLoading,
    updateQuantity,
    removeItem,
  } = useCart();
  
  const { formatPrice, getPrice } = useCurrency();

  // Calculate cart totals based on selected currency
  const cartTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const price = getPrice(item.prices);
      return sum + (price * item.quantity);
    }, 0);
    
    const tax = subtotal * TAX_RATE;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total = subtotal + tax + shipping;
    
    return { subtotal, tax, shipping, total };
  }, [items, getPrice]);

  // Handle quantity change
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    await updateQuantity(itemId, newQuantity, user?.uid);
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: string) => {
    await removeItem(itemId, user?.uid);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-3 right-3 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] md:right-4 md:inset-y-4 md:max-w-md bg-background z-50 overflow-hidden rounded-sm shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <h2 className="font-body text-lg tracking-wider">
                  CART ({itemCount})
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
                  aria-label="Close cart"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="h-16 w-16 text-foreground/20 mb-4" />
                  <h3 className="font-body text-xl mb-2">Your cart is empty</h3>
                  <p className="text-sm text-foreground/60 mb-6">
                    Add some items to get started
                  </p>
                  <Link
                    href="/clothings"
                    onClick={onClose}
                    className="inline-block px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-md font-body text-sm"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                // Cart Items List
                <div className="space-y-6">
                  {items.map((item) => {
                    const itemPrice = getPrice(item.prices);
                    
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="flex gap-4 pb-6 border-b border-foreground/10 last:border-0"
                      >
                        {/* Product Image */}
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={onClose}
                          className="relative w-24 h-24 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
                              No Image
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/product/${item.slug}`}
                                onClick={onClose}
                                className="font-body font-medium text-sm mb-1 hover:text-foreground/60 transition-colors line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              {item.size && (
                                <p className="text-xs text-foreground/60">Size: {item.size}</p>
                              )}
                              {item.color?.name && (
                                <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                                  <span>Color:</span>
                                  <div
                                    className="w-3 h-3 rounded-full border border-foreground/20"
                                    style={{ backgroundColor: item.color.hex }}
                                  />
                                  <span>{item.color.name}</span>
                                </div>
                              )}
                              {!item.inStock && (
                                <p className="text-xs text-red-500 mt-1">Out of stock</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isLoading}
                              className="p-1 hover:bg-foreground/5 rounded transition-colors ml-2 disabled:opacity-50"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4 text-foreground/60" />
                            </button>
                          </div>

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 border border-foreground/20 rounded-md">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={isLoading || item.quantity <= 1}
                                className="p-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-body text-sm w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={isLoading || item.quantity >= item.maxQuantity}
                                className="p-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-body font-semibold text-sm">
                              {formatPrice(itemPrice * item.quantity)}
                            </span>
                          </div>
                          
                          {/* Max quantity warning */}
                          {item.quantity >= item.maxQuantity && (
                            <p className="text-xs text-orange-500 mt-1">
                              Max quantity reached
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Totals and Checkout */}
            {items.length > 0 && (
              <div className="border-t border-foreground/10 bg-background">
                {/* Totals */}
                <div className="px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Subtotal</span>
                    <span className="font-body font-medium">{formatPrice(cartTotals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Tax ({TAX_RATE * 100}%)</span>
                    <span className="font-body font-medium">{formatPrice(cartTotals.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Shipping</span>
                    <span className="font-body font-medium">
                      {cartTotals.shipping === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(cartTotals.shipping)
                      )}
                    </span>
                  </div>
                  {cartTotals.subtotal < FREE_SHIPPING_THRESHOLD && cartTotals.shipping > 0 && (
                    <p className="text-xs text-foreground/60 pt-1">
                      Add {formatPrice(FREE_SHIPPING_THRESHOLD - cartTotals.subtotal)} more for free shipping
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                    <span className="font-body text-base">TOTAL</span>
                    <span className="font-body text-2xl">{formatPrice(cartTotals.total)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 space-y-3">
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="block w-full py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-md font-body text-sm text-center font-medium"
                  >
                    Proceed to Checkout
                  </Link>
                  <Link
                    href="/clothings"
                    onClick={onClose}
                    className="block w-full py-3 border border-foreground/20 hover:bg-foreground/5 transition-colors rounded-md font-body text-sm text-center"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full"
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}