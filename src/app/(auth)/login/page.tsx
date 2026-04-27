import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Use your TaskFlow account to access tasks, teams, and collaboration tools."
    >
      <LoginForm />
    </AuthCard>
  );
}
