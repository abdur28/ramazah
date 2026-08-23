import { redirect } from 'next/navigation';
import VerifyEmailPage from '@/components/authPages/VerifyEmailPage';

/**
 * The address is carried in the URL because there is no session yet — a signup
 * awaiting confirmation has a user but not a session, so there is nowhere else
 * to keep it. It is only ever used to address the code being checked; the code
 * itself is what proves anything.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const { email, redirect: to } = await searchParams;

  // Nothing to confirm without one, and guessing would confirm the wrong thing.
  if (!email) redirect('/auth/signup');

  const target = to && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard';

  return <VerifyEmailPage email={email} redirect={target} />;
}
