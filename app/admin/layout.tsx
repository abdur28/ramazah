import { requireAdmin, requireAuth } from '@/lib/auth/server';
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
      {/* Main Content */}
      <main className="lg:ml-72 pt-40 md:pt-44 lg:pt-28 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}