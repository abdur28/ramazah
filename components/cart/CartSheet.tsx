import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, Check, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from '@/constants';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { popular: popularCategories } = useNavigation();
  const { user } = useAuth();
  const {
    items,
    itemCount,
    isLoading,
    updateQuantity,
    removeItem,
  } = useCart();

  const { formatPrice, getPrice } = useCurrency();

  // Which line is mid-request. The store's `isLoading` is global, so a full
  // panel spinner used to cover the cart every time a quantity ticked by one.
  const [pendingId, setPendingId] = useState<string | null>(null);

  useScrollLock(isOpen);

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

  const freeShippingProgress = Math.min(1, cartTotals.subtotal / FREE_SHIPPING_THRESHOLD);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotals.subtotal);
  const hasUnavailableItems = items.some((item) => !item.inStock);

  // Handle quantity change
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setPendingId(itemId);
    await updateQuantity(itemId, newQuantity, user?.id);
    setPendingId(null);
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: string) => {
    setPendingId(itemId);
    await removeItem(itemId, user?.id);
    setPendingId(null);
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
            className="fixed inset-0 bg-foreground/50 z-50"
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-3 right-3 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] md:right-4 md:inset-y-4 md:max-w-md bg-card z-50 overflow-hidden rounded-sm shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-ink-muted" />
                <h2 className="font-body text-sm font-medium uppercase tracking-[0.18em] text-ink-muted">
                  Cart
                </h2>
                {itemCount > 0 && (
                  <span className="rounded-full bg-wash px-2 py-0.5 font-body text-[11px] tabular-nums text-ink-muted">
                    {itemCount}
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="-mr-2 rounded-md p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress to free shipping — an icon carries the "unlocked" state
                alongside the colour, never the colour alone. */}
            {items.length > 0 && (
              <div className="border-b border-rule px-6 py-3">
                <p className="mb-2 flex items-center gap-1.5 font-body text-xs text-ink-muted">
                  {remainingForFreeShipping > 0 ? (
                    <>
                      <span className="tabular-nums text-foreground">
                        {formatPrice(remainingForFreeShipping)}
                      </span>
                      away from free shipping
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span className="text-foreground">Free shipping unlocked</span>
                    </>
                  )}
                </p>
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-rule">
                  <motion.div
                    className="h-full bg-sage-deep"
                    initial={false}
                    animate={{ width: `${freeShippingProgress * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-6">
              {items.length === 0 ? (
                // Empty State
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wash">
                    <ShoppingBag className="h-6 w-6 text-sage" />
                  </div>
                  <h3 className="mt-5 font-body text-base text-foreground">Your cart is empty</h3>
                  <p className="mt-1 font-body text-sm text-ink-muted">
                    Everything we import from Egypt, in one place.
                  </p>

                  {/* Was a "Start Shopping" button pointing at /clothings — a
                      hoodskool route that does not exist here. */}
                  <div className="mt-6 w-full text-left">
                    <h4 className="mb-1 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                      Browse
                    </h4>
                    {popularCategories.slice(0, 4).map((category) => (
                      <Link
                        key={category.href}
                        href={category.href}
                        onClick={onClose}
                        className="block border-b border-rule/60 py-3 font-body text-sm text-foreground transition-colors last:border-b-0 hover:text-sage-deep"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                // Cart Items List
                <div>
                  {items.map((item) => {
                    const itemPrice = getPrice(item.prices);
                    const isPending = pendingId === item.id;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isPending ? 0.5 : 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="flex gap-4 border-b border-rule/60 py-5 last:border-0"
                      >
                        {/* Product Image */}
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={onClose}
                          className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-wash transition-opacity hover:opacity-80"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-body text-[11px] text-ink-faint">
                              No image
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/product/${item.slug}`}
                                onClick={onClose}
                                className="line-clamp-2 font-body text-sm text-foreground transition-colors hover:text-sage-deep"
                              >
                                {item.name}
                              </Link>

                              {/* Variant axes: the rendered label when the
                                  product uses the generic option model
                                  ('250g / Ground'), the legacy apparel axes
                                  otherwise. */}
                              <div className="mt-1 space-y-0.5">
                                {item.variantLabel && !item.size && !item.color && (
                                  <p className="font-body text-xs text-ink-muted">
                                    {item.variantLabel}
                                  </p>
                                )}
                                {item.size && (
                                  <p className="font-body text-xs text-ink-muted">Size: {item.size}</p>
                                )}
                                {item.color?.name && (
                                  <div className="flex items-center gap-1.5 font-body text-xs text-ink-muted">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full border border-rule"
                                      style={{ backgroundColor: item.color.hex }}
                                    />
                                    {item.color.name}
                                  </div>
                                )}
                                {item.quantity > 1 && (
                                  <p className="font-body text-xs tabular-nums text-ink-muted">
                                    {formatPrice(itemPrice)} each
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isLoading}
                              className="-mr-1 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-destructive disabled:opacity-50"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {!item.inStock && (
                            <p className="mt-2 flex items-center gap-1.5 font-body text-xs text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Out of stock
                            </p>
                          )}

                          {/* Price and Quantity */}
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="flex items-center rounded-sm border border-rule">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={isLoading || item.quantity <= 1}
                                className="p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-body text-sm tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={isLoading || item.quantity >= item.maxQuantity}
                                className="p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="text-right">
                              <span className="font-body text-sm font-medium tabular-nums text-foreground">
                                {formatPrice(itemPrice * item.quantity)}
                              </span>
                              {item.quantity >= item.maxQuantity && (
                                <p className="font-body text-[11px] text-warning">
                                  All {item.maxQuantity} in stock
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Totals and Checkout */}
            {items.length > 0 && (
              <div className="border-t border-rule bg-card">
                {/* Totals */}
                <div className="space-y-2 px-6 py-4 font-body text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Subtotal</span>
                    <span className="tabular-nums">{formatPrice(cartTotals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">VAT ({TAX_RATE * 100}%)</span>
                    <span className="tabular-nums">{formatPrice(cartTotals.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Shipping</span>
                    {cartTotals.shipping === 0 ? (
                      <span className="flex items-center gap-1 text-success">
                        <Check className="h-3.5 w-3.5" />
                        Free
                      </span>
                    ) : (
                      <span className="tabular-nums">{formatPrice(cartTotals.shipping)}</span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between border-t border-rule pt-3">
                    <span className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                      Total
                    </span>
                    <span className="font-body text-xl font-medium tabular-nums text-foreground">
                      {formatPrice(cartTotals.total)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
                  {hasUnavailableItems && (
                    <p className="mb-3 flex items-start gap-1.5 font-body text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Remove the out-of-stock items to check out — the order would be
                      rejected with them in the basket.
                    </p>
                  )}

                  {hasUnavailableItems ? (
                    <span
                      aria-disabled="true"
                      className="block w-full cursor-not-allowed rounded-md bg-wash py-3 text-center font-body text-sm font-medium text-ink-faint"
                    >
                      Proceed to Checkout
                    </span>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="block w-full rounded-md bg-sage-deep py-3 text-center font-body text-sm font-medium text-background transition-colors hover:bg-sage-deep/90"
                    >
                      Proceed to Checkout
                    </Link>
                  )}

                  {/* The sheet sits over the page you were already browsing, so
                      continuing is a dismissal, not a destination. */}
                  <button
                    onClick={onClose}
                    className="mt-3 block w-full py-2 text-center font-body text-sm text-ink-muted transition-colors hover:text-foreground"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
