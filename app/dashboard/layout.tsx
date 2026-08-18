import { requireAuth } from '@/lib/auth/server';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { redirect } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {

  const authUser = await requireAuth('/dashboard');  

  return (
    <div className="min-h-screen bg-background">
      <DashboardLayout authUser={authUser} />
      {/* Main Content */}
      <main className="lg:ml-72 pt-40 md:pt-44 lg:pt-28 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}