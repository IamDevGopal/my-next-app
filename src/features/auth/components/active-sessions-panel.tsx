"use client";

import { useCallback, useEffect, useState } from "react";
import { listSessions, revokeSession } from "../api/auth.api";
import { getAccessToken } from "../utils/auth-storage";
import type { SessionData } from "../types/auth.type";
import { getErrorMessage } from "@/lib/http/get-error-message";

type Status = "loading" | "ready" | "error";

export function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setStatus("error");
      setErrorMessage("You are not signed in.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await listSessions(token);
      setSessions(response.data.sessions);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(session: SessionData) {
    const confirmMessage = session.isCurrent
      ? "Revoking this device signs you out immediately. Continue?"
      : `Revoke "${session.deviceName ?? "Unknown device"}"?`;
    if (!window.confirm(confirmMessage)) return;

    const token = getAccessToken();
    if (!token) return;

    setRevokingId(session.id);
    try {
      await revokeSession(token, session.id);
      if (session.isCurrent) {
        // Current session revoked → next request will 401, api-client will
        // clear tokens. Force redirect now for instant feedback.
        window.location.href = "/login";
        return;
      }
      await load();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRevokingId(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading active sessions…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Active sessions
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Devices currently signed in to your account. Revoking a session
            ends access from that device immediately.
          </p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={() => void load()}
          type="button"
        >
          Refresh
        </button>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          No active sessions found.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-950">
                    {session.deviceName ?? "Unknown device"}
                  </span>
                  {session.isCurrent ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      This device
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {session.ipAddress ?? "Unknown IP"} ·{" "}
                  {formatDate(session.createdAt)}
                </p>
                {session.userAgent ? (
                  <p className="truncate text-xs text-slate-400">
                    {session.userAgent}
                  </p>
                ) : null}
              </div>
              <button
                className="shrink-0 rounded-md border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={revokingId === session.id}
                onClick={() => void handleRevoke(session)}
                type="button"
              >
                {revokingId === session.id
                  ? "Revoking…"
                  : session.isCurrent
                    ? "Sign out this device"
                    : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
