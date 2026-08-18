import LoginPage from "@/components/authPages/LoginPage";

export default async function Page({params}: any) {
  const { redirect } = await params;
  return (
    <LoginPage redirect={redirect ? `${redirect}` : '/dashboard'} />
  );
}

export async function generateMetadata() {
  return {
    title: 'Login | Ramazah',
  };
}