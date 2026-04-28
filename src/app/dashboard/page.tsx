"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { me } from "@/features/auth/api/auth.api";
import type { MeData } from "@/features/auth/types/auth.type";
import {
  clearAuthTokens,
  getAccessToken,
} from "@/features/auth/utils/auth-storage";
import { getErrorMessage } from "@/lib/http/get-error-message";

type DashboardStatus = "loading" | "ready" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [user, setUser] = useState<MeData["user"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const accessToken = getAccessToken();

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const response = await me(accessToken);
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
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-40 animate-pulse rounded-md bg-white" />
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Session expired</h1>
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
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">TaskFlow</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              Dashboard
            </h1>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Welcome, {user?.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
              <p className="mt-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {user?.role}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
