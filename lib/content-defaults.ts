import { COMPANY } from '@/constants';

/**
 * Editable copy, with the code as the fallback.
 *
 * Deliberately free of server imports. The admin editor is a client component
 * and needs these defaults to open a page that has never been edited — importing
 * them from `lib/content.ts` dragged `@/lib/supabase/server` into the browser
 * bundle and the build refused it, correctly.
 *
 * The rule that makes this safe: **every default below is the text the site
 * renders today.** An empty `site_content` table produces exactly the current
 * site, a missing key produces the current section, and a row whose shape has
 * drifted produces the current section too, because the merge is per-field
 * rather than wholesale. Nothing here can take a page down.
 *
 * Layout is deliberately not editable. The pages keep their components and their
 * design in code, and only words and pictures come from the database — a page
 * builder would let somebody produce a page that does not look like this shop,
 * which is a bigger loss than the flexibility is a gain.
 */

export interface PolicySection {
  heading: string;
  body: string[];
}

export interface PolicyContent {
  standfirst: string;
  sections: PolicySection[];
  /** Shows the "still being finalised, ask us" note at the foot. */
  awaitingCopy: boolean;
}

export interface HomeBand {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
}

export interface HomeTile {
  /** Matches the category slug, which is also the tile's link. */
  slug: string;
  name: string;
  blurb: string;
  imageUrl: string;
  imageAlt: string;
}

export interface HomeContent {
  hero: {
    /** Three stepped lines. Fewer is fine; the indent scales with however many. */
    lines: string[];
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    imageUrl: string;
    imageAlt: string;
  };
  bands: HomeBand[];
  /**
   * The six tiles in the category table. Their sizes and the way they are cut
   * across the grid stay in code — that composition is the design, and an
   * editor that could re-cut it could break the page's whole top half.
   */
  tiles: HomeTile[];
  story: {
    eyebrow: string;
    title: string;
    /** Paragraphs, over the photograph. */
    body: string[];
    ctaLabel: string;
    ctaHref: string;
    imageUrl: string;
    imageAlt: string;
  };
  newsletter: {
    eyebrow: string;
    title: string;
    body: string;
  };
}

export type ContentKey =
  | 'home' | 'faq' | 'terms' | 'privacy' | 'returns' | 'shipping' | 'cookies';

// ─────────────────────────────────────────────────────── defaults

/**
 * Kept in step with the pages by being the thing the pages read. If a default
 * here is wrong, the site is wrong — there is no second copy to drift from.
 */
export const DEFAULTS: Record<ContentKey, any> = {
  home: {
    hero: {
      lines: ['The pantry,', 'The shelf,', 'The table'],
      body: 'Veils and scarves, coffee and spices, beauty, kitchenware and home goods — sourced in Egypt and sent anywhere in Nigeria.',
      primaryLabel: 'Start shopping',
      primaryHref: '/categories/veils-scarves',
      secondaryLabel: 'How ordering works',
      secondaryHref: '/contact',
      imageUrl: '',
      imageAlt: '',
    },
    tiles: [
      { slug: 'veils-scarves',        name: 'Veils & Scarves',        blurb: 'Chiffon, jersey and embroidered, in the colours that sell.', imageUrl: '', imageAlt: '' },
      { slug: 'food-pantry',          name: 'Food & Pantry',          blurb: '', imageUrl: '', imageAlt: '' },
      { slug: 'beauty-personal-care', name: 'Beauty & Personal Care', blurb: 'Oils, soaps and skincare.', imageUrl: '', imageAlt: '' },
      { slug: 'kitchen-dining',       name: 'Kitchen & Dining',       blurb: '', imageUrl: '', imageAlt: '' },
      { slug: 'home-decor',           name: 'Home & Decor',           blurb: '', imageUrl: '', imageAlt: '' },
      { slug: 'school-stationery',    name: 'School & Stationery',    blurb: '', imageUrl: '', imageAlt: '' },
    ],
    story: {
      eyebrow: 'Why Egypt',
      title: 'Bought at the market, not from a catalogue',
      body: [
        'Everything here is chosen in person — the coffee ground to the roast we actually drink, the chiffon picked for how it sits in Lagos heat rather than how it photographs.',
        'Perishables carry their expiry date on the product page, and stock that has passed it cannot be ordered. That is enforced in the system, not promised in a paragraph.',
        'And if what you want is not on the shelf, it is still on the table — send us the item and we will source it on the next run.',
      ],
      ctaLabel: 'Ask for something specific',
      ctaHref: '/contact',
      imageUrl: '',
      imageAlt: '',
    },
    newsletter: {
      eyebrow: 'Restocks and arrivals',
      title: 'Know when the next crate lands',
      body: 'Stock arrives in batches, and the coffee and dates go first. Account holders hear first.',
    },
    bands: [
      {
        eyebrow: 'Veils & Scarves',
        title: 'Chiffon that behaves in the heat',
        body: 'Plain, embroidered and jersey veils in the colours that actually sell, picked in person at the market rather than from a supplier catalogue.',
        href: '/categories/veils-scarves',
        imageUrl: '',
        imageAlt: '',
      },
      {
        eyebrow: 'Coffee & Tea',
        title: 'Ground the morning it ships',
        body: 'Egyptian coffee in 250g and 1kg, whole bean or ground to your grind, alongside hibiscus and loose black tea.',
        href: '/categories/food-pantry/coffee-tea',
        imageUrl: '',
        imageAlt: '',
      },
    ],
  },

  faq: {
    standfirst: 'How the shop works, in the order people usually ask.',
    awaitingCopy: false,
    sections: [
      {
        heading: 'Can you get something that is not on the site?',
        body: [
          'Yes — that is the main service. Send us the item, a photo or a link, and we source it in Egypt on the next run and ship it with everything else.',
          'Tell us your budget and the quantity when you write, and we will come back with a price before anything is bought.',
        ],
      },
      {
        heading: 'How do I pay?',
        body: [
          'Place the order on the site and you will receive an invoice. Settle it by bank transfer. There is no card payment on the site.',
          'Nothing ships until the invoice is settled.',
        ],
      },
      {
        heading: 'How long does delivery take?',
        body: [
          'Standard delivery is two to three weeks — your order joins the next consignment out of Egypt. Express is available at extra cost; ask before you order.',
        ],
      },
    ],
  },

  terms: {
    standfirst: 'The agreement between you and Ramazah Store when you place an order.',
    awaitingCopy: true,
    sections: [
      {
        heading: 'Who you are dealing with',
        body: [
          `Ramazah Store is a trading name of ${COMPANY.legalName}${
            COMPANY.rcNumber ? `, registered in Nigeria as RC ${COMPANY.rcNumber}` : ''
          }. Your contract is with that company.`,
        ],
      },
      {
        heading: 'Orders and invoices',
        body: [
          'Placing an order on this site is a request to buy, not a completed sale. The sale is agreed when we issue your invoice, and goods are dispatched once it is settled.',
          'Prices are shown in Naira. Currency conversions elsewhere on the site are for guidance only.',
        ],
      },
      {
        heading: 'Sourced-to-order items',
        body: [
          'Where we buy an item at your request, we confirm the price with you before purchase. Once bought on your behalf, it is yours.',
        ],
      },
      {
        heading: 'The full terms',
        body: [
          'The complete terms — including liability, cancellation and dispute resolution — are being prepared and will be published here.',
        ],
      },
    ],
  },

  privacy: {
    standfirst: 'What we hold, why we hold it, and what we never do with it.',
    awaitingCopy: true,
    sections: [
      {
        heading: 'What the site stores',
        body: [
          'An account holds your name, email address, phone number and delivery address, along with your order history and anything you save to your wishlist.',
          'Email preferences are yours to change at any time under Account, and unsubscribing from newsletters does not stop order emails.',
        ],
      },
      {
        heading: 'What we do not do',
        body: [
          'We do not sell your details, and we do not take card numbers — payment is by transfer against an invoice, so no card data ever reaches this site.',
        ],
      },
      {
        heading: 'The full policy',
        body: [
          'The complete policy, including retention periods and how to request deletion of your data, is being prepared. You can delete your account yourself at any time from Account settings.',
        ],
      },
    ],
  },

  returns: {
    standfirst: 'What to do when something arrives wrong.',
    awaitingCopy: true,
    sections: [
      {
        heading: 'Damaged or incorrect items',
        body: [
          'Photograph the item and the packaging and send them to us within a few days of delivery, quoting your order number. We deal with breakages and picking mistakes ourselves.',
        ],
      },
      {
        heading: 'Perishables',
        body: [
          'Food and cosmetics cannot be returned once opened, for the same reason no grocer takes back an opened bag of coffee. If a perishable arrives past its expiry date, that is on us — tell us and we will replace or refund it.',
        ],
      },
      {
        heading: 'Sourced-to-order items',
        body: [
          'Items bought specifically at your request are not stock, so they are handled case by case. We will always tell you before buying whether a request can be returned.',
        ],
      },
    ],
  },

  shipping: {
    standfirst: 'How your order reaches you, and how long it takes.',
    awaitingCopy: false,
    sections: [
      {
        heading: 'Standard shipping — two to three weeks',
        body: [
          'The default. Your order joins the next consignment out of Egypt and is delivered to your address anywhere in Nigeria.',
        ],
      },
      {
        heading: 'Express — faster, at extra cost',
        body: [
          'If you need something sooner, say so before ordering and we will quote the surcharge. Express is priced per order, because it depends on weight and destination.',
        ],
      },
      {
        heading: 'Where we deliver',
        body: [
          'Anywhere in Nigeria. Delivery cost is shown at checkout, and larger orders ship free — the threshold is displayed in your cart as you add items.',
        ],
      },
      {
        heading: 'Tracking your order',
        body: [
          'Order status is on your account under Orders, and we email you when the consignment lands and when your parcel goes out for delivery.',
        ],
      },
    ],
  },

  cookies: {
    standfirst: 'What this site keeps on your device, and why.',
    awaitingCopy: true,
    sections: [
      {
        heading: 'Signing in',
        body: [
          "A session cookie keeps you signed in and is refreshed as you browse. Without it you would be signed out on every page.",
        ],
      },
      {
        heading: 'Your basket and preferences',
        body: [
          "Your basket, your chosen currency and your recent searches are kept in your browser's local storage on your own device, so they survive a refresh. Clearing your browser data clears them.",
        ],
      },
    ],
  },
};

