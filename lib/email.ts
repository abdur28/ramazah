// lib/email.ts
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { Order, OrderItem, Product, WishlistItem, CurrencyCode } from '@/types/types';

// Configure Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD 
  }
});

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    usd: '$',
    rub: '₽'
  };
  return symbols[currency] || currency.toUpperCase();
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: CurrencyCode): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${price.toFixed(2)}`;
}

// Update the handlebars helper registration to use the new function
handlebars.registerHelper('formatPrice', function(price: number, currency: CurrencyCode) {
  return formatPrice(price, currency);
});

handlebars.registerHelper('getCurrencySymbol', function(currency: CurrencyCode) {
  return getCurrencySymbol(currency);
});

// Register Handlebars helpers
handlebars.registerHelper('gt', function(a: number, b: number) {
  return a > b;
});

handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

handlebars.registerHelper('or', function(...args: any[]) {
  const values = args.slice(0, -1);
  return values.some(val => !!val);
});

handlebars.registerHelper('and', function(...args: any[]) {
  const values = args.slice(0, -1);
  return values.every(val => !!val);
});

handlebars.registerHelper('formatPrice', function(price: number, currency: CurrencyCode) {
  const symbol = currency === 'usd' ? '$' : '₽';
  return `${symbol}${price.toFixed(2)}`;
});

handlebars.registerHelper('multiply', function(a: number, b: number) {
  return a * b;
});

// Email types
export enum EmailType {
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  NEW_ARRIVALS = 'new_arrivals',
  PROMOTIONS = 'promotions',
  WISHLIST_ALERT = 'wishlist_alert',
  NEWSLETTER = 'newsletter',
  ADMIN_ORDER_NOTIFICATION = 'admin_order_notification'
}

interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData?: Record<string, any>;
  emailType: EmailType;
}

/**
 * Get compiled email template with data
 */
function getCompiledTemplate(templateName: string, templateData: Record<string, any>) {
  try {
    const templatePath = path.join(process.cwd(), 'emails', `${templateName}.html`);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);
    return template(templateData);
  } catch (error) {
    console.error(`Template error for ${templateName}:`, error);
    // Fallback HTML
    return `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #000; color: #fff;">
        <h2 style="color: #F8E231;">${templateData.title || 'Ramazah Notification'}</h2>
        <p>${templateData.message || ''}</p>
        <p style="color: #999;">Best regards,<br>The Ramazah Team</p>
      </div>
    `;
  }
}

/**
 * Send email with template
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const templateData = {
      title: options.subject,
      message: 'Thank you for choosing Ramazah.',
      currentYear: new Date().getFullYear(),
      companyName: 'Ramazah',
      websiteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      logoUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/ramazah-logo.png`,
      ...options.templateData
    };

    const html = getCompiledTemplate(options.templateName, templateData);
    
    // Development mode - log instead of sending
    if (process.env.NODE_ENV === 'development' && process.env.EMAIL_DEBUG === 'true') {
      console.log('-------- EMAIL DEBUG --------');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Type: ${options.emailType}`);
      console.log(`Template: ${options.templateName}`);
      return true;
    }
    
    // Send email
    await transporter.sendMail({
      from: `"Ramazah" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: html,
      headers: {
        'X-Email-Type': options.emailType
      }
    });
    
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  order: Order
): Promise<boolean> {
  const currencySymbol = order.currency === 'usd' ? '$' : '₽';
  
  return sendEmail({
    to: order.customerEmail,
    subject: `Order Confirmed #${order.orderNumber} - Ramazah`,
    templateName: 'order',
    emailType: EmailType.ORDER_CONFIRMATION,
    templateData: {
      title: 'Order Confirmed!',
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      customerName: order.customerName,
      items: order.items,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost || 0,
      tax: order.tax || 0,
      total: order.total,
      currency: order.currency,
      currencySymbol,
      deliveryType: order.deliveryType,
      shippingAddress: order.shippingAddress,
      trackOrderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/track/${order.orderNumber}`,
      isOrderConfirmation: true
    }
  });
}

/**
 * Send new arrivals email
 */
export async function sendNewArrivalsEmail(
  to: string,
  firstName: string,
  products: Array<{
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string }>;
    prices: Array<{ currency: CurrencyCode; price: number }>;
  }>
): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Fresh Drops 🔥 New Streetwear Just Landed - Ramazah',
    templateName: 'new_arrivals',
    emailType: EmailType.NEW_ARRIVALS,
    templateData: {
      title: 'New Arrivals',
      firstName,
      products: products.map(p => ({
        ...p,
        imageUrl: p.images[0]?.url,
        productUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/product/${p.slug}`,
        priceUSD: p.prices.find(pr => pr.currency === 'usd')?.price || 0,
        priceRUB: p.prices.find(pr => pr.currency === 'rub')?.price || 0
      })),
      shopUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/shop`
    }
  });
}

/**
 * Send promotions email
 */
export async function sendPromotionsEmail(
  to: string,
  firstName: string,
  promoData: {
    title: string;
    description: string;
    discountCode?: string;
    discountPercent?: number;
    expiryDate?: string;
    featuredProducts?: Array<{
      id: string;
      name: string;
      slug: string;
      images: Array<{ url: string }>;
      prices: Array<{ currency: CurrencyCode; price: number; compareAtPrice?: number }>;
    }>;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `${promoData.title} - Limited Time Offer! 🎁`,
    templateName: 'promotions',
    emailType: EmailType.PROMOTIONS,
    templateData: {
      title: promoData.title,
      firstName,
      description: promoData.description,
      discountCode: promoData.discountCode,
      discountPercent: promoData.discountPercent,
      expiryDate: promoData.expiryDate,
      products: promoData.featuredProducts?.map(p => ({
        ...p,
        imageUrl: p.images[0]?.url,
        productUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/product/${p.slug}`,
        priceUSD: p.prices.find(pr => pr.currency === 'usd')?.price || 0,
        priceRUB: p.prices.find(pr => pr.currency === 'rub')?.price || 0,
        compareAtPriceUSD: p.prices.find(pr => pr.currency === 'usd')?.compareAtPrice || 0,
        compareAtPriceRUB: p.prices.find(pr => pr.currency === 'rub')?.compareAtPrice || 0
      })),
      shopUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/shop`
    }
  });
}

/**
 * Send wishlist alert (item back in stock)
 */
export async function sendWishlistAlertEmail(
  to: string,
  firstName: string,
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string }>;
    prices: Array<{ currency: CurrencyCode; price: number }>;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Back in Stock! ${product.name} - Ramazah`,
    templateName: 'wishlist_alert',
    emailType: EmailType.WISHLIST_ALERT,
    templateData: {
      title: 'Your Wishlist Item is Back!',
      firstName,
      productName: product.name,
      productImage: product.images[0]?.url,
      productUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/product/${product.slug}`,
      priceUSD: product.prices.find(p => p.currency === 'usd')?.price || 0,
      priceRUB: product.prices.find(p => p.currency === 'rub')?.price || 0,
      wishlistUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/wishlist`
    }
  });
}

/**
 * Send custom newsletter
 */
export async function sendNewsletterEmail(
  to: string,
  firstName: string,
  newsletterData: {
    subject: string;
    headline: string;
    content: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: newsletterData.subject,
    templateName: 'custom',
    emailType: EmailType.NEWSLETTER,
    templateData: {
      title: newsletterData.headline,
      firstName,
      content: newsletterData.content,
      imageUrl: newsletterData.imageUrl,
      ctaText: newsletterData.ctaText,
      ctaUrl: newsletterData.ctaUrl
    }
  });
}

/**
 * Send admin notification for new order
 */
export async function sendAdminOrderNotification(
  order: Order
): Promise<boolean> {
  const currencySymbol = order.currency === 'usd' ? '$' : '₽';
  
  return sendEmail({
    to: 'abdurrahmanidris235@gmail.com',
    subject: `New Order #${order.orderNumber} - ${currencySymbol}${order.total}`,
    templateName: 'order',
    emailType: EmailType.ADMIN_ORDER_NOTIFICATION,
    templateData: {
      title: '🎯 New Order Received!',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost || 0,
      tax: order.tax || 0,
      total: order.total,
      currency: order.currency,
      currencySymbol,
      deliveryType: order.deliveryType,
      shippingAddress: order.shippingAddress,
      customerNotes: order.customerNotes,
      adminUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/orders/${order.id}`,
      isAdminNotification: true
    }
  });
}

/**
 * Send order delivered notification
 */
export async function sendOrderDeliveredEmail(
  order: Order
): Promise<boolean> {
  const currencySymbol = getCurrencySymbol(order.currency);
  
  return sendEmail({
    to: order.customerEmail,
    subject: `Your Order Has Been Delivered! #${order.orderNumber} - Ramazah`,
    templateName: 'order',
    emailType: EmailType.ORDER_DELIVERED,
    templateData: {
      title: 'Your Order Has Been Delivered!',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customerName: order.customerName,
      items: order.items,
      currency: order.currency,
      currencySymbol,
      total: order.total,
      deliveryType: order.deliveryType,
      trackOrderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/orders`,
      isOrderDelivered: true,
      // message: 'Thank you for shopping with Ramazah! We hope you love your new items. Please let us know if you have any questions or concerns.'
    }
  });
}

/**
 * Send order shipped notification
 */
export async function sendOrderShippedEmail(
  order: Order
): Promise<boolean> {
  const currencySymbol = order.currency === 'usd' ? '$' : '₽';
  
  return sendEmail({
    to: order.customerEmail,
    subject: `Your Order is On Its Way! #${order.orderNumber} - Ramazah`,
    templateName: 'order',
    emailType: EmailType.ORDER_SHIPPED,
    templateData: {
      title: 'Your Order Has Shipped!',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customerName: order.customerName,
      items: order.items,
      currency: order.currency,
      currencySymbol,
      total: order.total,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingAddress: order.shippingAddress,
      trackOrderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/track/${order.orderNumber}`,
      isOrderShipped: true,
      // message: 'Thank you for shopping with Ramazah! We hope you love your new items. Please let us know if you have any questions or concerns.'
    }
  });
}
