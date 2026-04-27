import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset access"
      subtitle="Enter your email and we will send a password reset link if the account exists."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
