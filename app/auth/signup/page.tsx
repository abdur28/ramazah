import SignupPage from "@/components/authPages/SignupPage";

export default async function Page({params}: any) {
  const { redirect } = await params;
  return (
    <SignupPage redirect={redirect ? `${redirect}` : '/dashboard'} />
  );
}

export async function generateMetadata() {
  return {
    title: 'Signup | Ramazah',
  };
}