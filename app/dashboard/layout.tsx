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
      <main className="p-6 pt-32 md:p-8 md:pt-36 lg:ml-72 lg:pt-28">
        {children}
      </main>
    </div>
  );
}