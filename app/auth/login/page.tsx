import LoginPage from "@/components/authPages/LoginPage";
import { safeRedirect } from "@/lib/auth/redirect";

export default async function Page({ searchParams }: any) {
  // `searchParams`, not `params`: this route has no dynamic segments, so
  // `params` is always empty and the `?redirect=` was being thrown away —
  // signing in from a product page always dumped you on the dashboard.
  const { redirect } = await searchParams;

  return <LoginPage redirect={safeRedirect(redirect)} />;
}

export async function generateMetadata() {
  return {
    title: 'Sign in | Ramazah Store',
  };
}
