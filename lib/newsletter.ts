import { createClient } from '@/lib/supabase/client';

/**
 * Subscribe an email address to the newsletter.
 *
 * Anonymous visitors can insert and nothing else — they cannot read the list
 * back, which is enforced by RLS rather than by this function. A repeat address
 * hits the unique index and is reported as already subscribed rather than as a
 * failure, because to the person typing it there is no difference.
 */
export async function subscribeToNewsletter(email: string, source = 'footer') {
  const address = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { error: 'Enter a valid email address.' };
  }

  const { error } = await createClient()
    .from('newsletter_subscribers')
    .insert({ email: address, source });

  // 23505 is a unique violation: the address is already on the list.
  if (error && error.code !== '23505') {
    console.error('Newsletter subscribe failed:', error.message);
    return { error: 'Could not subscribe just now. Please try again.' };
  }

  return { error: null };
}
