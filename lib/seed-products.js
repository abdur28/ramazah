// scripts/seed-products.js
const admin = require('firebase-admin');

// Environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

// ============ HELPER FUNCTIONS ============

const USD_TO_RUB = 95;

function createPrices(usdPrice, usdComparePrice = null) {
  const prices = [];
  const usdDiscount = usdComparePrice 
    ? Math.round(((usdComparePrice - usdPrice) / usdComparePrice) * 100)
    : 0;
  
  prices.push({
    currency: 'usd',
    price: usdPrice,
    compareAtPrice: usdComparePrice || 0,
    discountPercent: usdDiscount,
  });
  
  const rubPrice = Math.round(usdPrice * USD_TO_RUB);
  const rubComparePrice = usdComparePrice ? Math.round(usdComparePrice * USD_TO_RUB) : 0;
  
  prices.push({
    currency: 'rub',
    price: rubPrice,
    compareAtPrice: rubComparePrice,
    discountPercent: usdDiscount,
  });
  
  return prices;
}

function createColor(name, hex) {
  return { name, hex };
}

const COLORS = {
  BLACK: createColor('Black', '#000000'),
  WHITE: createColor('White', '#FFFFFF'),
  CREAM: createColor('Cream', '#FFFDD0'),
  NAVY: createColor('Navy', '#000080'),
  OLIVE: createColor('Olive', '#808000'),
  BEIGE: createColor('Beige', '#F5F5DC'),
  CHARCOAL: createColor('Charcoal', '#36454F'),
  GREY: createColor('Grey', '#808080'),
  BROWN: createColor('Brown', '#964B00'),
};

// ============ CATEGORIES DATA ============

const categoriesData = [
  // TOP LEVEL
  { name: 'Clothings', slug: 'clothings', path: 'clothings', description: 'Premium streetwear clothing collection' },
  { name: 'Accessories', slug: 'accessories', path: 'accessories', description: 'Complete your look with accessories' },
  { name: 'Candles & Matches', slug: 'candles-matches', path: 'candles-matches', description: 'Handcrafted candles and premium matches' },
  { name: 'Artwork', slug: 'artwork', path: 'artwork', description: 'Original street art and prints' },
  
  // CLOTHINGS SUBCATEGORIES
  { name: 'Hood Wears', slug: 'hood-wears', path: 'clothings/hood-wears', description: 'Essential streetwear pieces', subtitle: 'Street Culture' },
  { name: 'Bespoke', slug: 'bespoke', path: 'clothings/bespoke', description: 'Custom tailored clothing', subtitle: 'Tailoring' },
  
  // HOOD WEARS ITEMS
  { name: 'T-Shirts', slug: 't-shirts', path: 'clothings/hood-wears/t-shirts', description: 'Premium graphic and essential tees' },
  { name: 'Hoodies', slug: 'hoodies', path: 'clothings/hood-wears/hoodies', description: 'Heavyweight hoodies and sweatshirts' },
  { name: 'Shirts', slug: 'shirts', path: 'clothings/hood-wears/shirts', description: 'Button-up shirts and overshirts' },
  { name: 'Pants', slug: 'pants', path: 'clothings/hood-wears/pants', description: 'Cargo pants and trousers' },
  { name: 'Jackets', slug: 'jackets', path: 'clothings/hood-wears/jackets', description: 'Outerwear and jackets' },
  
  // BESPOKE ITEMS
  { name: 'Pant Trousers', slug: 'pant-trousers', path: 'clothings/bespoke/pant-trousers', description: 'Tailored trousers' },
  { name: 'Waist Coats', slug: 'waist-coats', path: 'clothings/bespoke/waist-coats', description: 'Custom waistcoats' },
  { name: 'Suits', slug: 'suits', path: 'clothings/bespoke/suits', description: 'Made-to-measure suits' },
  
  // ACCESSORIES ITEMS
  { name: 'Caps', slug: 'caps', path: 'accessories/caps', description: 'Baseball caps and snapbacks' },
  { name: 'Bucket Hats', slug: 'bucket-hats', path: 'accessories/bucket-hats', description: 'Unstructured bucket hats' },
  { name: 'Ski Masks', slug: 'ski-masks', path: 'accessories/ski-masks', description: 'Winter ski masks' },
];

// ============ COLLECTIONS DATA ============

const collectionsData = [
  {
    name: 'Winter 2024',
    slug: 'winter-2024',
    description: 'Our latest winter collection featuring heavyweight fabrics and layering pieces',
    bannerImage: {
      id: 'banner-winter',
      publicId: 'collections/winter-2024',
      url: '/banner/Ramazah_банер 1 _resized.jpg',
      secureUrl: '/banner/Ramazah_банер 1 _resized.jpg',
      altText: 'Winter 2024 Collection',
    }
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    description: 'Timeless basics you need in your wardrobe',
  },
  {
    name: 'Limited Edition',
    slug: 'limited-edition',
    description: 'Exclusive pieces in limited quantities',
  },
];

// ============ PRODUCTS DATA ============

const productsData = [
  // ============ HOODIES ============
  {
    name: 'Classic Black Hoodie',
    slug: 'classic-black-hoodie',
    description: 'Premium heavyweight cotton hoodie with embroidered logo. Perfect for everyday wear with a relaxed fit and soft brushed interior. Features adjustable drawstring hood, kangaroo pocket, and ribbed cuffs for comfort.',
    shortDescription: 'Premium heavyweight cotton hoodie with embroidered logo',
    prices: createPrices(75.00, 95.00),
    categoryPath: 'Clothings > Hood Wears > Hoodies',
    collectionSlug: 'essentials',
    images: [
      {
        id: 'img-bh-1',
        publicId: 'products/hoodies/black-hoodie-1',
        url: '/banner/Ramazah_банер правка.jpg',
        secureUrl: '/banner/Ramazah_банер правка.jpg',
        altText: 'Classic Black Hoodie Front',
        order: 0,
        isPrimary: true,
      },
      {
        id: 'img-bh-2',
        publicId: 'products/hoodies/black-hoodie-2',
        url: '/banner/Ramazah_банер 1 _resized.jpg',
        secureUrl: '/banner/Ramazah_банер 1 _resized.jpg',
        altText: 'Classic Black Hoodie Back',
        order: 1,
        isPrimary: false,
      },
    ],
    variants: [
      { 
        id: 'bh-s-black', 
        size: 'S', 
        color: COLORS.BLACK,
        sku: 'BH-001-S-BLK', 
        prices: createPrices(75.00, 95.00),
        stockCount: 15, 
        inStock: true 
      },
      { 
        id: 'bh-m-black', 
        size: 'M', 
        color: COLORS.BLACK,
        sku: 'BH-001-M-BLK', 
        prices: createPrices(75.00, 95.00),
        stockCount: 25, 
        inStock: true 
      },
      { 
        id: 'bh-l-black', 
        size: 'L', 
        color: COLORS.BLACK,
        sku: 'BH-001-L-BLK', 
        prices: createPrices(75.00, 95.00),
        stockCount: 30, 
        inStock: true 
      },
      { 
        id: 'bh-xl-black', 
        size: 'XL', 
        color: COLORS.BLACK,
        sku: 'BH-001-XL-BLK', 
        prices: createPrices(75.00, 95.00),
        stockCount: 20, 
        inStock: true 
      },
      { 
        id: 'bh-xxl-black', 
        size: 'XXL', 
        color: COLORS.BLACK,
        sku: 'BH-001-XXL-BLK', 
        prices: createPrices(75.00, 95.00),
        stockCount: 10, 
        inStock: true 
      },
    ],
    sku: 'BH-001',
    inStock: true,
    totalStock: 100,
    lowStockAlert: 10,
    tags: ['streetwear', 'hoodie', 'classic', 'embroidered', 'winter'],
    colors: [COLORS.BLACK],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    materials: ['100% Cotton', 'Heavyweight Fabric'],
    details: {
      weight: '450gsm',
      fit: 'Relaxed',
      origin: 'Made in Lithuania',
    },
    isNew: true,
    isFeatured: true,
    isBestseller: true,
    careInstructions: 'Machine wash cold, tumble dry low. Do not bleach.',
    sizeGuide: 'S: 36-38" | M: 38-40" | L: 40-42" | XL: 42-44" | XXL: 44-46"',
  },
  {
    name: 'Oversized Cream Hoodie',
    slug: 'oversized-cream-hoodie',
    description: 'Ultra-soft oversized hoodie in cream colorway. Features dropped shoulders, extended sleeves, and a boxy fit for maximum comfort. Premium quality with screen-printed graphics.',
    shortDescription: 'Ultra-soft oversized hoodie in cream',
    prices: createPrices(85.00),
    categoryPath: 'Clothings > Hood Wears > Hoodies',
    collectionSlug: 'winter-2024',
    images: [
      {
        id: 'img-ch-1',
        publicId: 'products/hoodies/cream-hoodie',
        url: '/Ramazah_Catalog_0408202312555 1_resized.jpg',
        secureUrl: '/Ramazah_Catalog_0408202312555 1_resized.jpg',
        altText: 'Oversized Cream Hoodie',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'ch-m-cream', 
        size: 'M', 
        color: COLORS.CREAM,
        sku: 'CH-002-M-CRM', 
        prices: createPrices(85.00),
        stockCount: 18, 
        inStock: true 
      },
      { 
        id: 'ch-l-cream', 
        size: 'L', 
        color: COLORS.CREAM,
        sku: 'CH-002-L-CRM', 
        prices: createPrices(85.00),
        stockCount: 22, 
        inStock: true 
      },
      { 
        id: 'ch-xl-cream', 
        size: 'XL', 
        color: COLORS.CREAM,
        sku: 'CH-002-XL-CRM', 
        prices: createPrices(85.00),
        stockCount: 15, 
        inStock: true 
      },
    ],
    sku: 'CH-002',
    inStock: true,
    totalStock: 55,
    tags: ['oversized', 'hoodie', 'cream', 'graphics', 'winter'],
    colors: [COLORS.CREAM],
    sizes: ['M', 'L', 'XL'],
    materials: ['80% Cotton', '20% Polyester'],
    isNew: true,
    isFeatured: true,
  },

  // ============ T-SHIRTS ============
  {
    name: 'Graphic Tee - Street Edition',
    slug: 'graphic-tee-street-edition',
    description: 'Bold graphic t-shirt featuring original street art design. Made from premium ring-spun cotton for superior comfort and durability. Screen-printed with eco-friendly inks.',
    shortDescription: 'Bold graphic tee with street art design',
    prices: createPrices(35.00, 45.00),
    categoryPath: 'Clothings > Hood Wears > T-Shirts',
    collectionSlug: 'essentials',
    images: [
      {
        id: 'img-gt-1',
        publicId: 'products/tshirts/graphic-tee',
        url: '/DSC05257 (1).jpg',
        secureUrl: '/DSC05257 (1).jpg',
        altText: 'Graphic Tee Street Edition',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'gt-s-black', 
        size: 'S', 
        color: COLORS.BLACK,
        sku: 'GT-003-S-BLK', 
        prices: createPrices(35.00, 45.00),
        stockCount: 20, 
        inStock: true 
      },
      { 
        id: 'gt-m-black', 
        size: 'M', 
        color: COLORS.BLACK,
        sku: 'GT-003-M-BLK', 
        prices: createPrices(35.00, 45.00),
        stockCount: 35, 
        inStock: true 
      },
      { 
        id: 'gt-l-black', 
        size: 'L', 
        color: COLORS.BLACK,
        sku: 'GT-003-L-BLK', 
        prices: createPrices(35.00, 45.00),
        stockCount: 30, 
        inStock: true 
      },
      { 
        id: 'gt-xl-black', 
        size: 'XL', 
        color: COLORS.BLACK,
        sku: 'GT-003-XL-BLK', 
        prices: createPrices(35.00, 45.00),
        stockCount: 25, 
        inStock: true 
      },
      { 
        id: 'gt-s-white', 
        size: 'S', 
        color: COLORS.WHITE,
        sku: 'GT-003-S-WHT', 
        prices: createPrices(35.00, 45.00),
        stockCount: 18, 
        inStock: true 
      },
      { 
        id: 'gt-m-white', 
        size: 'M', 
        color: COLORS.WHITE,
        sku: 'GT-003-M-WHT', 
        prices: createPrices(35.00, 45.00),
        stockCount: 30, 
        inStock: true 
      },
    ],
    sku: 'GT-003',
    inStock: true,
    totalStock: 158,
    tags: ['graphic', 't-shirt', 'street-art', 'print'],
    colors: [COLORS.BLACK, COLORS.WHITE],
    sizes: ['S', 'M', 'L', 'XL'],
    materials: ['100% Ring-Spun Cotton'],
    isBestseller: true,
  },
  {
    name: 'Essential White Tee',
    slug: 'essential-white-tee',
    description: 'Clean and minimal white t-shirt perfect for any occasion. Features a comfortable regular fit with reinforced shoulder seams and high-quality stitching throughout.',
    shortDescription: 'Clean minimal white t-shirt',
    prices: createPrices(28.00),
    categoryPath: 'Clothings > Hood Wears > T-Shirts',
    collectionSlug: 'essentials',
    images: [
      {
        id: 'img-wt-1',
        publicId: 'products/tshirts/white-tee',
        url: '/Ramazah_0408202445315 - Copy.jpg',
        secureUrl: '/Ramazah_0408202445315 - Copy.jpg',
        altText: 'Essential White Tee',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'wt-s-white', 
        size: 'S', 
        color: COLORS.WHITE,
        sku: 'WT-004-S-WHT', 
        prices: createPrices(28.00),
        stockCount: 25, 
        inStock: true 
      },
      { 
        id: 'wt-m-white', 
        size: 'M', 
        color: COLORS.WHITE,
        sku: 'WT-004-M-WHT', 
        prices: createPrices(28.00),
        stockCount: 40, 
        inStock: true 
      },
      { 
        id: 'wt-l-white', 
        size: 'L', 
        color: COLORS.WHITE,
        sku: 'WT-004-L-WHT', 
        prices: createPrices(28.00),
        stockCount: 35, 
        inStock: true 
      },
      { 
        id: 'wt-xl-white', 
        size: 'XL', 
        color: COLORS.WHITE,
        sku: 'WT-004-XL-WHT', 
        prices: createPrices(28.00),
        stockCount: 20, 
        inStock: true 
      },
    ],
    sku: 'WT-004',
    inStock: true,
    totalStock: 120,
    tags: ['essential', 't-shirt', 'basic', 'white'],
    colors: [COLORS.WHITE],
    sizes: ['S', 'M', 'L', 'XL'],
    materials: ['100% Cotton'],
    isBestseller: true,
  },

  // ============ PANTS ============
  {
    name: 'Urban Cargo Pants',
    slug: 'urban-cargo-pants',
    description: 'Functional cargo pants with multiple pockets and adjustable waist. Made from durable cotton twill with reinforced knees. Perfect blend of style and utility.',
    shortDescription: 'Functional cargo pants with multiple pockets',
    prices: createPrices(95.00),
    categoryPath: 'Clothings > Hood Wears > Pants',
    collectionSlug: 'winter-2024',
    images: [
      {
        id: 'img-cp-1',
        publicId: 'products/pants/cargo',
        url: '/Ramazah_Catalog_0408202313209_resized.jpg',
        secureUrl: '/Ramazah_Catalog_0408202313209_resized.jpg',
        altText: 'Urban Cargo Pants',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'cp-28-black', 
        size: '28', 
        color: COLORS.BLACK,
        sku: 'CP-005-28-BLK', 
        prices: createPrices(95.00),
        stockCount: 10, 
        inStock: true 
      },
      { 
        id: 'cp-30-black', 
        size: '30', 
        color: COLORS.BLACK,
        sku: 'CP-005-30-BLK', 
        prices: createPrices(95.00),
        stockCount: 15, 
        inStock: true 
      },
      { 
        id: 'cp-32-black', 
        size: '32', 
        color: COLORS.BLACK,
        sku: 'CP-005-32-BLK', 
        prices: createPrices(95.00),
        stockCount: 20, 
        inStock: true 
      },
      { 
        id: 'cp-34-olive', 
        size: '34', 
        color: COLORS.OLIVE,
        sku: 'CP-005-34-OLV', 
        prices: createPrices(95.00),
        stockCount: 15, 
        inStock: true 
      },
    ],
    sku: 'CP-005',
    inStock: true,
    totalStock: 60,
    tags: ['cargo', 'pants', 'utility', 'streetwear'],
    colors: [COLORS.BLACK, COLORS.OLIVE],
    sizes: ['28', '30', '32', '34', '36'],
    materials: ['Cotton Twill', 'Reinforced Knees'],
    isNew: true,
  },

  // ============ JACKETS ============
  {
    name: 'Technical Windbreaker',
    slug: 'technical-windbreaker',
    description: 'Lightweight windbreaker with water-resistant coating. Features adjustable hood, zippered pockets, and elastic cuffs. Perfect for unpredictable weather.',
    shortDescription: 'Water-resistant technical windbreaker',
    prices: createPrices(120.00, 150.00),
    categoryPath: 'Clothings > Hood Wears > Jackets',
    collectionSlug: 'winter-2024',
    images: [
      {
        id: 'img-wb-1',
        publicId: 'products/jackets/windbreaker',
        url: '/banner/Ramazah_банер 1 _resized.jpg',
        secureUrl: '/banner/Ramazah_банер 1 _resized.jpg',
        altText: 'Technical Windbreaker',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'wb-m-navy', 
        size: 'M', 
        color: COLORS.NAVY,
        sku: 'WB-006-M-NVY', 
        prices: createPrices(120.00, 150.00),
        stockCount: 12, 
        inStock: true 
      },
      { 
        id: 'wb-l-navy', 
        size: 'L', 
        color: COLORS.NAVY,
        sku: 'WB-006-L-NVY', 
        prices: createPrices(120.00, 150.00),
        stockCount: 15, 
        inStock: true 
      },
      { 
        id: 'wb-xl-black', 
        size: 'XL', 
        color: COLORS.BLACK,
        sku: 'WB-006-XL-BLK', 
        prices: createPrices(120.00, 150.00),
        stockCount: 10, 
        inStock: true 
      },
    ],
    sku: 'WB-006',
    inStock: true,
    totalStock: 37,
    tags: ['jacket', 'windbreaker', 'technical', 'waterproof'],
    colors: [COLORS.NAVY, COLORS.BLACK],
    sizes: ['M', 'L', 'XL'],
    materials: ['Nylon', 'Water-Resistant Coating'],
    isNew: true,
    isFeatured: true,
  },

  // ============ ACCESSORIES - CAPS ============
  {
    name: 'Logo Cap',
    slug: 'logo-cap',
    description: 'Classic 6-panel cap with embroidered front logo. Adjustable back strap for perfect fit. Curved brim and breathable cotton construction.',
    shortDescription: 'Classic 6-panel cap with embroidered logo',
    prices: createPrices(30.00),
    categoryPath: 'Accessories > Caps',
    collectionSlug: 'essentials',
    images: [
      {
        id: 'img-cap-1',
        publicId: 'products/accessories/cap',
        url: '/banner/Ramazah_банер 1 _resized.jpg',
        secureUrl: '/banner/Ramazah_банер 1 _resized.jpg',
        altText: 'Logo Cap',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'cap-os-black', 
        size: 'One Size', 
        color: COLORS.BLACK,
        sku: 'CAP-007-OS-BLK', 
        prices: createPrices(30.00),
        stockCount: 30, 
        inStock: true 
      },
      { 
        id: 'cap-os-white', 
        size: 'One Size', 
        color: COLORS.WHITE,
        sku: 'CAP-007-OS-WHT', 
        prices: createPrices(30.00),
        stockCount: 20, 
        inStock: true 
      },
      { 
        id: 'cap-os-navy', 
        size: 'One Size', 
        color: COLORS.NAVY,
        sku: 'CAP-007-OS-NVY', 
        prices: createPrices(30.00),
        stockCount: 15, 
        inStock: true 
      },
    ],
    sku: 'CAP-007',
    inStock: true,
    totalStock: 65,
    tags: ['cap', 'hat', 'accessory', 'logo'],
    colors: [COLORS.BLACK, COLORS.WHITE, COLORS.NAVY],
    sizes: ['One Size'],
    materials: ['100% Cotton'],
    isBestseller: true,
  },

  // ============ ACCESSORIES - BUCKET HATS ============
  {
    name: 'Bucket Hat - Classic',
    slug: 'bucket-hat-classic',
    description: 'Unstructured bucket hat made from premium cotton twill. Features embroidered logo and adjustable chin strap. One size fits most.',
    shortDescription: 'Unstructured bucket hat in premium cotton',
    prices: createPrices(35.00),
    categoryPath: 'Accessories > Bucket Hats',
    collectionSlug: 'essentials',
    images: [
      {
        id: 'img-bh-1',
        publicId: 'products/accessories/bucket-hat',
        url: '/DSC09599.jpg',
        secureUrl: '/DSC09599.jpg',
        altText: 'Bucket Hat Classic',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'bhat-os-black', 
        size: 'One Size', 
        color: COLORS.BLACK,
        sku: 'BHAT-008-OS-BLK', 
        prices: createPrices(35.00),
        stockCount: 25, 
        inStock: true 
      },
      { 
        id: 'bhat-os-beige', 
        size: 'One Size', 
        color: COLORS.BEIGE,
        sku: 'BHAT-008-OS-BGE', 
        prices: createPrices(35.00),
        stockCount: 20, 
        inStock: true 
      },
    ],
    sku: 'BHAT-008',
    inStock: true,
    totalStock: 45,
    tags: ['bucket-hat', 'accessory', 'headwear'],
    colors: [COLORS.BLACK, COLORS.BEIGE],
    sizes: ['One Size'],
    materials: ['100% Cotton Twill'],
    isFeatured: true,
  },

  // ============ BESPOKE - SUITS ============
  {
    name: 'Custom Tailored Suit',
    slug: 'custom-tailored-suit',
    description: 'Premium made-to-measure suit crafted from Italian wool. Includes jacket and trousers with full lining and hand-stitched details. Perfect for special occasions.',
    shortDescription: 'Made-to-measure suit in Italian wool',
    prices: createPrices(450.00, 650.00),
    categoryPath: 'Clothings > Bespoke > Suits',
    collectionSlug: 'limited-edition',
    images: [
      {
        id: 'img-suit-1',
        publicId: 'products/bespoke/suit',
        url: '/Ramazah_0408202445315 - Copy.jpg',
        secureUrl: '/Ramazah_0408202445315 - Copy.jpg',
        altText: 'Custom Tailored Suit',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [
      { 
        id: 'suit-38-navy', 
        size: '38', 
        color: COLORS.NAVY,
        sku: 'SU-009-38-NVY', 
        prices: createPrices(450.00, 650.00),
        stockCount: 3, 
        inStock: true 
      },
      { 
        id: 'suit-40-charcoal', 
        size: '40', 
        color: COLORS.CHARCOAL,
        sku: 'SU-009-40-CHR', 
        prices: createPrices(450.00, 650.00),
        stockCount: 2, 
        inStock: true 
      },
    ],
    sku: 'SU-009',
    inStock: true,
    totalStock: 5,
    lowStockAlert: 3,
    tags: ['bespoke', 'suit', 'tailored', 'formal'],
    colors: [COLORS.NAVY, COLORS.CHARCOAL],
    sizes: ['36', '38', '40', '42', '44'],
    materials: ['Italian Wool', 'Full Canvas Construction'],
    isLimitedEdition: true,
    isFeatured: true,
  },

  // ============ CANDLES ============
  {
    name: 'Hood Essence Candle',
    slug: 'hood-essence-candle',
    description: 'Hand-poured soy wax candle with custom fragrance blend. Burns for 40+ hours with natural wood wick. Comes in matte black glass vessel.',
    shortDescription: 'Hand-poured soy candle with custom fragrance',
    prices: createPrices(45.00),
    categoryPath: 'Candles & Matches',
    images: [
      {
        id: 'img-candle-1',
        publicId: 'products/candles/essence',
        url: '/DSC09599.jpg',
        secureUrl: '/DSC09599.jpg',
        altText: 'Hood Essence Candle',
        order: 0,
        isPrimary: true,
      },
    ],
    variants: [],
    sku: 'CAN-010',
    inStock: true,
    totalStock: 30,
    tags: ['candle', 'home', 'fragrance', 'handmade'],
    colors: [COLORS.BLACK],
    sizes: [],
    materials: ['Soy Wax', 'Wood Wick', 'Glass'],
    details: {
      'Burn Time': '40+ hours',
      Scent: 'Sandalwood & Vanilla',
      Weight: '8oz',
    },
    isNew: true,
    isFeatured: true,
  },
];

// ============ SEED FUNCTIONS ============

async function seedCategories() {
  console.log('\n📁 Seeding categories...');
  const batch = db.batch();
  let count = 0;

  for (const categoryData of categoriesData) {
    const categoryRef = db.collection('categories').doc();
    const category = {
      id: categoryRef.id,
      ...categoryData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(categoryRef, category);
    count++;
    console.log(`  ✅ ${category.path}`);
  }

  await batch.commit();
  console.log(`\n✨ Seeded ${count} categories`);
}

async function seedCollections() {
  console.log('\n🎨 Seeding collections...');
  const batch = db.batch();
  let count = 0;

  for (const collectionData of collectionsData) {
    const collectionRef = db.collection('collections').doc();
    const collection = {
      id: collectionRef.id,
      ...collectionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(collectionRef, collection);
    count++;
    console.log(`  ✅ ${collection.name}`);
  }

  await batch.commit();
  console.log(`\n✨ Seeded ${count} collections`);
}

async function seedProducts() {
  console.log('\n🛍️  Seeding products...');
  const batch = db.batch();
  let count = 0;

  for (const productData of productsData) {
    const productRef = db.collection('products').doc();
    const product = {
      id: productRef.id,
      ...productData,
      viewCount: 0,
      salesCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(productRef, product);
    count++;
    console.log(`  ✅ ${product.name} (${product.sku})`);
  }

  await batch.commit();
  console.log(`\n✨ Seeded ${count} products`);
}

// ============ MAIN FUNCTION ============

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  console.log(`💱 USD to RUB rate: ${USD_TO_RUB}`);

  try {
    await seedCategories();
    await seedCollections();
    await seedProducts();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`  • ${categoriesData.length} categories`);
    console.log(`  • ${collectionsData.length} collections`);
    console.log(`  • ${productsData.length} products`);
    console.log('\n✅ Ready for testing!\n');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seeding
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });