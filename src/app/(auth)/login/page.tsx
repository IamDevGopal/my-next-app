import { env } from "@/config/env";
import { LoginForm } from "@/features/auth/components/login-form";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.16),_transparent_30%),linear-gradient(135deg,_#f6fbfa_0%,_#eef6f3_48%,_#f8fafc_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-8 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.32)] sm:px-10 lg:min-h-[42rem] lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.28),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_24%)]" />
          <div className="absolute right-0 top-0 h-56 w-56 translate-x-16 -translate-y-12 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-10 translate-y-10 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-100 backdrop-blur">
                <Sparkles className="size-4" />
                Admin workspace access
              </div>
              <div className="max-w-2xl space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                  {env.NEXT_PUBLIC_APP_NAME}
                </p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Sign in to the control center for teams, tasks, and delivery flow.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Review priorities, unblock collaboration, and keep every moving part of your workspace in one sharp operational view.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-3xl font-semibold text-white">24/7</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Visibility across active work, blockers, and momentum.
                </p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-3xl font-semibold text-white">1 Hub</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Teams, assignments, and updates flowing through one system.
                </p>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-3xl font-semibold text-white">Secure</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Authenticated access designed for focused admin operations.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,_#0f766e_0%,_#14b8a6_50%,_#eab308_100%)]" />
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                <ShieldCheck className="size-4" />
                Protected sign in
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h2>
                <p className="max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                  Use your admin credentials to access dashboards, teams, and delivery controls without changing your existing workflow.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-slate-600">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  <span>Same login behavior, stronger interface, clearer focus.</span>
                </div>
              </div>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
