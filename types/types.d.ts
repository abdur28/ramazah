
// ============ USER TYPES ============

export type UserRole = 'user' | 'admin';
export type SignInMethod = 'email' | 'google';
export type CurrencyCode = 'ngn' | 'usd' | 'egp';

export interface UserProfile {
  uid: string;            // profiles.id (auth.users.id)
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;

  role: UserRole;

  emailVerified: boolean;

  // Default address, denormalised from the addresses table for convenience.
  address?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  preferences?: UserPreferences;

  emailOptIn?: boolean;
  status?: 'active' | 'inactive';

  // Relations now live in their own tables; kept optional for legacy callers.
  orders?: string[];
  wishlistItems?: string[];
  signInMethod?: SignInMethod;

  createdAt: any;
  updatedAt: any;
}

export interface EmailNotifications {
  orderUpdates: boolean;
  promotions: boolean;
  newArrivals: boolean;
  wishlistAlerts: boolean;
  newsletter: boolean;
}

export interface UserPreferences {
  emailNotifications: EmailNotifications;
  currency?: string;
}

export interface Address {
  id?: string;
  userId?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ PRODUCT TYPES ============

export interface ProductImage {
  id: string;
  publicId: string;
  url: string;
  secureUrl: string;
  altText: string;
  order: number;
  isPrimary: boolean;
}

export interface ProductOptionValue {
  value: string;
  hex?: string;   // colour swatches only
}

export interface ProductOptionDef {
  name: string;                    // 'Weight', 'Grind', 'Shade', 'Colour', 'Size'
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  label?: string;                       // rendered axes, e.g. '250g / Ground'
  options?: Record<string, string>;     // { Weight: '250g', Grind: 'Ground' }
  prices?: ProductPrice[];
  stockCount: number;
  inStock: boolean;
  weight?: number;
  expiryDate?: string;

  // Legacy apparel axes, derived from options named Size/Colour when present.
  // Empty for most of the catalog; the storefront redesign should drop them.
  size?: string;
  color?: Color;
  imagePublicIds?: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;

  prices?:  ProductPrice[];
  
  itemType?: string;
  categoryPath: string; // Category path e.g. "Clothing > Tops"
  collectionSlug?: string;
  
  images: ProductImage[];
  variants?: ProductVariant[];
  
  sku: string;
  /**
   * Publication state. Draft and archived products are absent from the
   * storefront entirely — `product_listing` filters on this — so the admin
   * catalogue has to show it or a product can sit unpublished with nothing
   * anywhere saying why it is not on the site.
   */
  status?: 'draft' | 'active' | 'archived';
  inStock: boolean;
  totalStock: number;
  lowStockAlert?: number;
  
  tags: string[];
  options?: ProductOptionDef[];
  isPerishable?: boolean;
  ratingAvg?: number;
  ratingCount?: number;

  // Legacy apparel axes — see ProductVariant above.
  colors: Color[];
  sizes: string[];
  materials?: string[];
  
  details?: {
    [key: string]: string | number | boolean;
  };
  
  isNew?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isLimitedEdition?: boolean;
  
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  
  careInstructions?: string;
  sizeGuide?: string;
  
  viewCount?: number;
  salesCount?: number;
  
  createdAt: any;
  updatedAt: any;
  publishedAt?: any;
}

export  interface Category {
  id: string;
  name: string;
  slug: string;
  path: string; // Category path e.g. "Clothing > Tops"
  description?: string;
  bannerImage?: BannerImage;
  subtitle?: string;
  createdAt: any;
  updatedAt: any;
  subCategories?: Category[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  bannerImage?: BannerImage;
  createdAt: any;
  updatedAt: any;
}

export interface BannerImage {
  id: string;
  publicId: string;
  url: string;
  secureUrl: string;
  altText: string;
}

export interface Color {
  name: string;
  hex: string;
}

export interface Currency {
    name: string;
    code: CurrencyCode;
    symbol: string;
    isDefault?: boolean
}

export interface ProductPrice {
  currency: CurrencyCode;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
}


// ============ CART TYPES ============

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  prices: ProductPrice[];
  quantity: number;
  image: string;

  /** Rendered axes, e.g. '250g / Ground'. Empty for option-less products. */
  variantLabel?: string;

  size?: string;
  color?: Color;
  sku: string;
  
  inStock: boolean;
  maxQuantity: number;
  currentPrice?: number;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// ============ ORDER TYPES ============

export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export type DeliveryType = 'inStore' | 'delivery';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  currency: CurrencyCode;
  quantity: number;
  lineTotal?: number;

  // Snapshot of the variant at purchase time.
  variantLabel?: string;              // '250g / Ground'
  options?: Record<string, string>;

  // Legacy apparel axes, derived from options when present.
  size?: string;
  color?: Color;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  
  deliveryType: DeliveryType;
  
  items: OrderItem[];
  
  currency: CurrencyCode;
  subtotal: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  total: number;
  
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  shippingAddress?: Address;
  
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  paymentMethod?: string;
  paymentIntentId?: string;
  
  trackingNumber?: string;
  carrier?: string;
  
  customerNotes?: string;
  
  createdAt: any;
  updatedAt: any;
  paidAt?: any;
  shippedAt?: any;
  deliveredAt?: any;
  pickedUpAt?: any;
}

export interface CheckoutData {
  deliveryType: DeliveryType;
  email: string;
  phone: string;
  fullName: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface CreateOrderData {
  userId: string;
  deliveryType: DeliveryType;
  items: OrderItem[];
  currency: CurrencyCode;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  discountCode?: string;
  /** Pass a stable key per checkout attempt so retries return the original order. */
  idempotencyKey?: string;
}

// ============ WISHLIST TYPES ============

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

// ============ FILTER & QUERY TYPES ============

export interface ProductFilters {
  categoryPath?: string;        // e.g., "Clothing > Hoodies"
  itemType?: string;
  collection?: string;           // Collection slug
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];             // Color names
  sizes?: string[];
  tags?: string[];
  inStock?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  search?: string;
}

export interface PaginationParams {
  limit?: number;
  startAfter?: any;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// ============ CLOUDINARY TYPES ============

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
}

// ============ CONTACT FORM TYPES ============

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  inquiryType?: "general" | "wholesale" | "collaboration" | "press" | "support" | "career" | "other"
}