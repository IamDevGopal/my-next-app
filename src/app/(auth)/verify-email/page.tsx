import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { VerifyEmailFlow } from "@/features/auth/components/verify-email-flow";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      subtitle="We are confirming your verification link. Hang on a second."
    >
      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-md bg-slate-100" />
        }
      >
        <VerifyEmailFlow />
      </Suspense>
    </AuthCard>
  );
}
