import SignupPage from "@/components/authPages/SignupPage";
import { safeRedirect } from "@/lib/auth/redirect";

export default async function Page({ searchParams }: any) {
  const { redirect } = await searchParams;

  return <SignupPage redirect={safeRedirect(redirect)} />;
}

export async function generateMetadata() {
  return {
    title: 'Create an account | Ramazah',
  };
}
