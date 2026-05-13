"use client";

import {
  CalendarDays,
  CheckCircle2,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileForm } from "@/features/users/components/profile-form";
import { TeamsWorkspace } from "@/features/teams/components/teams-workspace";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { UserSearchPanel } from "@/features/users/components/user-search-panel";
import { getCurrentUser } from "@/features/users/api/users.api";
import type { CurrentUserData } from "@/features/users/types/user.type";
import {
  clearAuthTokens,
  getAccessToken,
} from "@/features/auth/utils/auth-storage";
import { getErrorMessage } from "@/lib/http/get-error-message";

type DashboardStatus = "loading" | "ready" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUserData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getCurrentUser(token);
        setAccessToken(token);
        setUser(response.data.user);
        setStatus("ready");
      } catch (error) {
        clearAuthTokens();
        setMessage(getErrorMessage(error));
        setStatus("error");
      }
    }

    void loadUser();
  }, [router]);

  function logout() {
    clearAuthTokens();
    router.replace("/login");
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-14 animate-pulse rounded-md bg-white" />
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <div className="h-96 animate-pulse rounded-lg bg-white" />
            <div className="h-96 animate-pulse rounded-lg bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (status === "error" || !user || !accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">
            Session expired
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {message ?? "Please sign in again."}
          </p>
          <button
            className="mt-5 h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={() => router.replace("/login")}
            type="button"
          >
            Back to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar
                avatarUrl={user.avatarUrl}
                name={user.name}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-700">
                  TaskFlow
                </p>
                <h1 className="truncate text-2xl font-semibold text-slate-950">
                  {user.name}
                </h1>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {user.profile?.headline ?? user.email}
                </p>
              </div>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={logout}
              type="button"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </header>

        <TeamsWorkspace accessToken={accessToken} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Identity and contact details
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <UserRound className="size-5" />
              </div>
            </div>
            <ProfileForm
              accessToken={accessToken}
              onUserUpdated={setUser}
              user={user}
            />
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">
                Account
              </h2>
              <div className="mt-4 space-y-3">
                <InfoRow
                  icon={<Mail className="size-4" />}
                  label="Email"
                  value={user.email}
                />
                <InfoRow
                  icon={<ShieldCheck className="size-4" />}
                  label="Status"
                  value={user.status}
                />
                <InfoRow
                  icon={<CheckCircle2 className="size-4" />}
                  label="Verified"
                  value={user.isEmailVerified ? "Yes" : "No"}
                />
                <InfoRow
                  icon={<CalendarDays className="size-4" />}
                  label="Joined"
                  value={formatDate(user.createdAt)}
                />
              </div>
            </section>

            <UserSearchPanel accessToken={accessToken} />
          </aside>
        </div>
      </div>
    </main>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
