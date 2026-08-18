import { Timestamp } from 'firebase/firestore';

// ============ USER TYPES ============

export type UserRole = 'user' | 'admin';
export type SignInMethod = 'email' | 'google';
export type CurrencyCode = 'rub' | 'usd';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  
  // Role
  role: UserRole;
  
  // Sign-in method
  signInMethod: SignInMethod;
  
  // Additional fields
  emailVerified: boolean;
  
  // Optional address
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
  
  // Relations (stored as arrays of IDs)
  orders: string[];
  wishlistItems: string[];
  
  // Preferences
  emailOptIn?: boolean;

  status?: 'active' | 'inactive';
  
  // Timestamps
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface ProductVariant {
  id: string;
  size?: string;
  color?: Color;
  sku: string;
  prices?: ProductPrice[];
  stockCount: number;
  inStock: boolean;
  imagePublicIds?: string[];
  weight?: number;
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
  inStock: boolean;
  totalStock: number;
  lowStockAlert?: number;
  
  tags: string[];
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
}

// ============ WISHLIST TYPES ============

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: Timestamp;
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