import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Set up a TaskFlow account to coordinate your work, teams, and conversations."
    >
      <RegisterForm />
    </AuthCard>
  );
}
