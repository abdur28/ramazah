import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Delete a customer account. Removing an auth user needs the privileged client,
 * so the caller's admin role is verified server-side first.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) {
    // orders.user_id is ON DELETE RESTRICT — customers with history are retained.
    return NextResponse.json(
      { error: 'Cannot delete a customer with order history. Deactivate them instead.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}
