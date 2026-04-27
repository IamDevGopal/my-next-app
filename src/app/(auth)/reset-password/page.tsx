import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set new password"
      subtitle="Use the reset token from your email to set a new password."
    >
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-md bg-slate-100" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
