"use client";

import {
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileForm } from "@/features/users/components/profile-form";
import { TeamsWorkspace } from "@/features/teams/components/teams-workspace";
import { TasksWorkspace } from "@/features/tasks/components/tasks-workspace";
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
type DashboardView = "teams" | "tasks" | "profile" | "people";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [activeView, setActiveView] = useState<DashboardView>("teams");
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
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="grid min-h-screen items-stretch lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="z-30 border-b border-slate-200 bg-white p-3 shadow-sm sm:p-6 lg:flex lg:min-h-screen lg:self-stretch lg:flex-col lg:border-b-0 lg:border-r lg:shadow-none">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white sm:size-10">
                <LayoutDashboard className="size-4 sm:size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  TaskFlow
                </p>
                <h1 className="text-base font-semibold text-slate-950">
                  Workspace
                </h1>
              </div>
            </div>

            <nav className="mt-3 grid grid-cols-3 gap-1 sm:mt-6 lg:grid-cols-1">
              <NavButton
                active={activeView === "teams"}
                icon={<UsersRound className="size-4" />}
                label="Teams"
                onClick={() => setActiveView("teams")}
              />
              <NavButton
                active={activeView === "tasks"}
                icon={<ListTodo className="size-4" />}
                label="Tasks"
                onClick={() => setActiveView("tasks")}
              />
              <NavButton
                active={activeView === "people"}
                icon={<Search className="size-4" />}
                label="People"
                onClick={() => setActiveView("people")}
              />
            </nav>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:mt-6 sm:block sm:p-3 lg:sticky lg:bottom-6 lg:mt-6">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={user.avatarUrl}
                name={user.name}
                size="sm"
              />
              <div className="min-w-0 max-[360px]:hidden sm:block">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user.profile?.headline ?? user.email}
                </p>
              </div>
            </div>
            <button
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:mt-3 sm:h-10 sm:w-full"
              onClick={logout}
              type="button"
            >
              <LogOut className="size-4" />
              <span className="max-[360px]:sr-only">Logout</span>
            </button>
          </div>
        </aside>

        <section className="min-w-0 p-3 sm:p-6">
          <div className="mx-auto max-w-7xl min-w-0">
            <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {activeView === "teams"
                    ? "Collaboration"
                    : activeView === "tasks"
                      ? "Execution"
                    : activeView === "profile"
                      ? "Account"
                      : "Network"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                  {activeView === "teams"
                    ? "Teams"
                    : activeView === "tasks"
                      ? "Tasks"
                    : activeView === "profile"
                      ? "Profile"
                      : "People"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeView === "teams"
                    ? "Create teams, manage members, invites, and join requests."
                    : activeView === "tasks"
                      ? "Track personal work, review team tasks, and update progress from one place."
                    : activeView === "profile"
                      ? "View and update your identity, contact, and public profile."
                    : "Search users before inviting them into teams."}
                </p>
              </div>
              <div className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-auto">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    aria-label="Open profile settings"
                    className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md border transition ${
                      activeView === "profile"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveView("profile")}
                    title="Profile settings"
                    type="button"
                  >
                    <Settings2 className="size-4" />
                  </button>
                </div>
              </div>
            </header>

            {activeView === "teams" ? (
              <TeamsWorkspace accessToken={accessToken} currentUserId={user.id} />
            ) : null}

            {activeView === "tasks" ? (
              <TasksWorkspace accessToken={accessToken} currentUserId={user.id} />
            ) : null}

            {activeView === "profile" ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Edit profile
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        This information powers your public user card and team
                        member identity.
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
                    <h3 className="text-base font-semibold text-slate-950">
                      Account summary
                    </h3>
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
                </aside>
              </div>
            ) : null}

            {activeView === "people" ? (
              <div className="max-w-2xl">
                <UserSearchPanel accessToken={accessToken} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button
      className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold transition sm:justify-start sm:gap-3 sm:px-3 ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="max-[360px]:sr-only">{label}</span>
    </button>
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
