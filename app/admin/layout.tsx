import { requireAdmin } from '@/lib/auth/server';
import AdminLayout from '@/components/layout/AdminLayout';
import { redirect } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await requireAdmin('/admin');

  if (!authUser) {
    redirect('/auth/login?redirect=/admin');
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminLayout authUser={authUser} />
      {/*
        The top padding clears two fixed bars on a phone — the storefront navbar
        and the admin chip row beneath it — and only the navbar on desktop, where
        the rail takes the left 18rem instead. It was `pt-40 md:pt-44`, roughly
        60px more than the bars occupy, which opened a gap above every heading.
        Matches the account area exactly.
      */}
      <main className="mx-auto max-w-[1400px] p-6 pt-32 md:p-8 md:pt-36 lg:ml-72 lg:pt-28">
        {children}
      </main>
    </div>
  );
}
