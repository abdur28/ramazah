// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendNewArrivalsEmail,
  sendPromotionsEmail,
  sendWishlistAlertEmail,
  sendNewsletterEmail,
  sendAdminOrderNotification,
  EmailType
} from '@/lib/email';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address
 */
function isValidEmail(email: string): boolean {
  return emailRegex.test(email);
}

/**
 * POST /api/send-email
 * Send various types of emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Email type is required' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Email data is required' },
        { status: 400 }
      );
    }

    // Handle different email types
    let success = false;
    let message = '';

    switch (type) {
      case EmailType.ORDER_CONFIRMATION:
        if (!data.order) {
          return NextResponse.json(
            { error: 'Order data is required for order confirmation email' },
            { status: 400 }
          );
        }
        success = await sendOrderConfirmationEmail(data.order);
        message = 'Order confirmation email sent successfully';
        break;

      case EmailType.ORDER_SHIPPED:
        if (!data.order) {
          return NextResponse.json(
            { error: 'Order data is required for order shipped email' },
            { status: 400 }
          );
        }
        success = await sendOrderShippedEmail(data.order);
        message = 'Order shipped email sent successfully';
        break;

      case EmailType.NEW_ARRIVALS:
        if (!data.to || !data.firstName || !data.products) {
          return NextResponse.json(
            { error: 'Missing required fields: to, firstName, products' },
            { status: 400 }
          );
        }
        if (!isValidEmail(data.to)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
          );
        }
        success = await sendNewArrivalsEmail(
          data.to,
          data.firstName,
          data.products
        );
        message = 'New arrivals email sent successfully';
        break;

      case EmailType.PROMOTIONS:
        if (!data.to || !data.firstName || !data.promoData) {
          return NextResponse.json(
            { error: 'Missing required fields: to, firstName, promoData' },
            { status: 400 }
          );
        }
        if (!isValidEmail(data.to)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
          );
        }
        if (!data.promoData.title || !data.promoData.description) {
          return NextResponse.json(
            { error: 'Promo data must include title and description' },
            { status: 400 }
          );
        }
        success = await sendPromotionsEmail(
          data.to,
          data.firstName,
          data.promoData
        );
        message = 'Promotion email sent successfully';
        break;

      case EmailType.WISHLIST_ALERT:
        if (!data.to || !data.firstName || !data.product) {
          return NextResponse.json(
            { error: 'Missing required fields: to, firstName, product' },
            { status: 400 }
          );
        }
        if (!isValidEmail(data.to)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
          );
        }
        success = await sendWishlistAlertEmail(
          data.to,
          data.firstName,
          data.product
        );
        message = 'Wishlist alert email sent successfully';
        break;

      case EmailType.NEWSLETTER:
        if (!data.to || !data.firstName || !data.newsletterData) {
          return NextResponse.json(
            { error: 'Missing required fields: to, firstName, newsletterData' },
            { status: 400 }
          );
        }
        if (!isValidEmail(data.to)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
          );
        }
        if (!data.newsletterData.subject || !data.newsletterData.headline || !data.newsletterData.content) {
          return NextResponse.json(
            { error: 'Newsletter data must include subject, headline, and content' },
            { status: 400 }
          );
        }
        success = await sendNewsletterEmail(
          data.to,
          data.firstName,
          data.newsletterData
        );
        message = 'Newsletter email sent successfully';
        break;

      case EmailType.ADMIN_ORDER_NOTIFICATION:
        if (!data.order) {
          return NextResponse.json(
            { error: 'Order data is required for admin notification' },
            { status: 400 }
          );
        }
        success = await sendAdminOrderNotification(data.order);
        message = 'Admin order notification sent successfully';
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/send-email/batch
 * Send emails to multiple recipients (for newsletters and promotions)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, recipients } = body;

    if (!type || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Type and recipients array are required' },
        { status: 400 }
      );
    }

    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        let success = false;

        switch (type) {
          case EmailType.NEW_ARRIVALS:
            if (!recipient.email || !recipient.firstName || !recipient.products) {
              results.failed++;
              results.errors.push(`Invalid data for ${recipient.email || 'unknown'}`);
              continue;
            }
            success = await sendNewArrivalsEmail(
              recipient.email,
              recipient.firstName,
              recipient.products
            );
            break;

          case EmailType.PROMOTIONS:
            if (!recipient.email || !recipient.firstName || !recipient.promoData) {
              results.failed++;
              results.errors.push(`Invalid data for ${recipient.email || 'unknown'}`);
              continue;
            }
            success = await sendPromotionsEmail(
              recipient.email,
              recipient.firstName,
              recipient.promoData
            );
            break;

          case EmailType.NEWSLETTER:
            if (!recipient.email || !recipient.firstName || !recipient.newsletterData) {
              results.failed++;
              results.errors.push(`Invalid data for ${recipient.email || 'unknown'}`);
              continue;
            }
            success = await sendNewsletterEmail(
              recipient.email,
              recipient.firstName,
              recipient.newsletterData
            );
            break;

          default:
            results.failed++;
            results.errors.push(`Unsupported batch email type: ${type}`);
            continue;
        }

        if (success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${recipient.email}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        results.failed++;
        results.errors.push(`Error sending to ${recipient.email}`);
      }
    }

    return NextResponse.json(
      {
        success: results.successful > 0,
        message: `Sent ${results.successful} out of ${results.total} emails`,
        results
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Batch email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}