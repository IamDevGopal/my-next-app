import Link from "next/link";
import { ActiveSessionsPanel } from "@/features/auth/components/active-sessions-panel";

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        className="text-sm font-medium text-emerald-700 hover:underline"
        href="/dashboard"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        Security settings
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Review and manage where your account is signed in.
      </p>
      <div className="mt-8">
        <ActiveSessionsPanel />
      </div>
    </div>
  );
}
