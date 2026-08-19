import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Deletes the caller's own account. Needs the privileged client, so it is
 * gated on a verified session rather than trusting anything from the body.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);

    if (error) {
      // orders.user_id is ON DELETE RESTRICT, so customers with order history
      // cannot be removed — that is deliberate.
      return NextResponse.json(
        { error: 'Account could not be deleted. Accounts with order history are retained.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
