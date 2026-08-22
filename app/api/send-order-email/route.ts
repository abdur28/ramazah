// app/api/send-order-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  sendOrderConfirmationEmail, 
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendAdminOrderNotification 
} from '@/lib/email';
import { Order } from '@/types/types';
import { requireAdminApi } from '@/lib/auth/api';

/**
 * Order lifecycle emails.
 *
 * **Nothing calls this route.** It has no caller anywhere in the app — order
 * confirmations are not wired up yet (see PLAN item 6) — but it was a live,
 * unauthenticated endpoint that takes an arbitrary order object and mails it
 * wherever the request says. Guarded rather than deleted, because it is the
 * shape the notification work will want.
 *
 * When confirmations are built, the customer-facing path must not come through
 * here: a shopper cannot be an admin, and mail should be sent by the server that
 * already knows the order, not by one that trusts a posted body.
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const { type, order, statusChange } = body;

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order data is required' },
        { status: 400 }
      );
    }

    let emailSent = false;

    switch (type) {
      case 'confirmation':
        // Send order confirmation to customer
        emailSent = await sendOrderConfirmationEmail(order as Order);
        break;

      case 'shipped':
        // Send shipped notification to customer
        emailSent = await sendOrderShippedEmail(order as Order);
        break;

      case 'delivered':
        // Send delivered notification to customer
        emailSent = await sendOrderDeliveredEmail(order as Order);
        break;

      case 'admin':
        // Send admin notification with status change info
        const orderWithStatus = {
          ...order,
          customerNotes: statusChange 
            ? `Status updated to: ${statusChange}` 
            : order.customerNotes
        } as Order;
        emailSent = await sendAdminOrderNotification(orderWithStatus);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid email type' },
          { status: 400 }
        );
    }

    if (emailSent) {
      return NextResponse.json(
        { success: true, message: 'Email sent successfully' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in send-order-email API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}