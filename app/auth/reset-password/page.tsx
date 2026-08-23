import ResetPasswordPage from "@/components/authPages/ResetPasswordPage";

export default function Page() {
  return (
    <ResetPasswordPage />
  );
}

export async function generateMetadata() {
  return {
    title: 'Reset Password | Ramazah Store',
  };
}