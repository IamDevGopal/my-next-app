import { env } from "@/config/env";
import { LoginForm } from "@/features/auth/components/login-form";
import { CheckCircle2, ShieldCheck } from "lucide-react";

const highlights = [
  "Plan personal and team work from one calm workspace.",
  "Discuss tasks with chat, comments, and meeting-ready context.",
  "Stay focused with secure access and role-aware collaboration.",
];

export default function LoginPage() {
  return (
    <main className="h-dvh overflow-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto grid h-full max-w-6xl grid-rows-[2.25rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:px-6 lg:py-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white">
              TF
            </div>
            <div>
              <p className="text-sm font-semibold leading-4">
                {env.NEXT_PUBLIC_APP_NAME}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Work coordination for focused teams
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
            <ShieldCheck className="size-4 text-emerald-700" />
            Secure user workspace
          </div>
        </header>

        <div className="grid min-h-0 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="hidden h-[24rem] rounded-2xl bg-white px-8 py-7 ring-1 ring-slate-200 lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-2xl space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-700">
                  User platform
                </p>
                <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-950">
                  Sign in and continue your work with your team.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-600">
                  Access tasks, team updates, chats, files, and calls from one
                  focused workspace.
                </p>
              </div>

              <div className="grid gap-2">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    <span className="text-sm leading-6 text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex h-[24rem] items-center rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-200 sm:px-7 lg:px-7">
            <div className="w-full">
              <div className="mb-5 space-y-2">
                <p className="text-sm font-semibold text-emerald-700 lg:hidden">
                  {env.NEXT_PUBLIC_APP_NAME}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Access your user workspace.
                </p>
              </div>

              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
