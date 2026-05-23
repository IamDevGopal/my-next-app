import { AuthCard } from "@/features/auth/components/auth-card";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";

export default function ResendVerificationPage() {
  return (
    <AuthCard
      title="Resend verification email"
      subtitle="Enter your account email and we will send a fresh verification link if the account is still pending."
    >
      <ResendVerificationForm />
    </AuthCard>
  );
}
