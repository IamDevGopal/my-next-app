"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { searchUsers } from "../api/users.api";
import type { PublicUserData } from "../types/user.type";
import { UserAvatar } from "./user-avatar";

interface UserSearchPanelProps {
  accessToken: string;
}

export function UserSearchPanel({ accessToken }: UserSearchPanelProps) {
  const searchInputId = useId();
  const searchHintId = `${searchInputId}-hint`;
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUserData[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "danger">(
    "neutral",
  );
  const [isSearching, setIsSearching] = useState(false);
  const searchMessageId = `${searchInputId}-message`;
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setIsSearching(false);
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 3) {
      setUsers([]);
      setMessage("Type at least 3 characters.");
      setMessageTone("danger");
      return;
    }

    if (normalizedQuery.length > 80) {
      setUsers([]);
      setMessage("Search by name or username using 80 characters or fewer.");
      setMessageTone("danger");
      return;
    }

    setIsSearching(true);
    setMessage(null);
    setMessageTone("neutral");
    const controller = new AbortController();
    searchControllerRef.current = controller;

    try {
      const response = await searchUsers({
        accessToken,
        query: normalizedQuery,
        limit: 8,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }
      setUsers(response.data.users);
      setMessage(response.data.users.length === 0 ? "No users found." : null);
      setMessageTone("neutral");
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setUsers([]);
      setMessage(getErrorMessage(error));
      setMessageTone("danger");
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null;
        setIsSearching(false);
      }
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">People</h2>
          <p className="mt-1 text-sm text-slate-500">TaskFlow network</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <Search className="size-5" />
        </div>
      </div>

      <form className="mt-5 flex gap-2" onSubmit={handleSearch}>
        <label className="sr-only" htmlFor={searchInputId}>
          Search users by name or username
        </label>
        <input
          id={searchInputId}
          aria-describedby={
            message ? `${searchHintId} ${searchMessageId}` : searchHintId
          }
          aria-invalid={Boolean(message && messageTone === "danger")}
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
          maxLength={80}
          onChange={(event) => {
            searchControllerRef.current?.abort();
            setQuery(event.target.value);
          }}
          placeholder="Search by name or username"
          type="search"
          value={query}
        />
        <button
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSearching}
          aria-label="Search users"
          type="submit"
          title="Search users"
        >
          <Search className="size-4" />
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500" id={searchHintId}>
        Enter 3–80 characters. Email search is not supported. Up to 8 matches
        are shown; narrow your search for more specific results.
      </p>

      <div className="mt-5 space-y-3">
        {users.map((user) => (
          <article
            className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
            key={user.id}
          >
            <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size="sm" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-950">
                {user.name}
              </h3>
              <p className="truncate text-xs text-slate-500">
                {user.username
                  ? `@${user.username}`
                  : (user.profile?.headline ?? "User")}
              </p>
            </div>
          </article>
        ))}
        {message ? (
          <p
            className={`text-sm font-medium ${
              messageTone === "danger" ? "text-rose-600" : "text-slate-500"
            }`}
            id={searchMessageId}
            aria-live={messageTone === "danger" ? "assertive" : "polite"}
            role={messageTone === "danger" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
