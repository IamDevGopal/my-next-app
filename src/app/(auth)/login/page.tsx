import { env } from "@/config/env";
import { LoginForm } from "@/features/auth/components/login-form";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const highlights = [
  "Track active work without losing the bigger picture.",
  "Review teams, assignments, and delivery updates in one place.",
  "Keep access focused and operational for admin workflows.",
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbfa_0%,_#eef5f2_52%,_#f8fafc_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-stretch lg:min-h-[calc(100vh-3rem)]">
        <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.10)] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,25rem)]">
          <section className="relative hidden overflow-hidden bg-slate-950 px-6 py-7 text-white lg:flex lg:flex-col lg:justify-between xl:px-8 xl:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.22),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.14),_transparent_24%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-sm font-medium text-emerald-100 backdrop-blur">
                <Sparkles className="size-4" />
                Admin workspace access
              </div>

              <div className="max-w-xl space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
                  {env.NEXT_PUBLIC_APP_NAME}
                </p>
                <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-white xl:text-[2.1rem]">
                  Sign in to your control center without leaving the screen.
                </h1>
                <p className="max-w-lg text-sm leading-7 text-slate-300 xl:text-[0.95rem]">
                  A compact workspace entry built for quick access to
                  dashboards, teams, and delivery flow.
                </p>
              </div>
            </div>

            <div className="relative grid gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <span className="text-sm leading-6 text-slate-200">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex min-h-full items-center px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            <div className="w-full space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                  <ShieldCheck className="size-4" />
                  Protected sign in
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-emerald-700 lg:hidden">
                    {env.NEXT_PUBLIC_APP_NAME}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
                    Welcome back
                  </h2>
                  <p className="max-w-md text-sm leading-6 text-slate-600">
                    Use your admin credentials to access the workspace in one
                    focused, responsive screen.
                  </p>
                </div>
              </div>

              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
