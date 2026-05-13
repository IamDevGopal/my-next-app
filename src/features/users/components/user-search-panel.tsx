"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { searchUsers } from "../api/users.api";
import type { PublicUserData } from "../types/user.type";
import { UserAvatar } from "./user-avatar";

interface UserSearchPanelProps {
  accessToken: string;
}

export function UserSearchPanel({ accessToken }: UserSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUserData[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setMessage("Type at least 2 characters.");
      return;
    }

    setIsSearching(true);
    setMessage(null);

    try {
      const response = await searchUsers({
        accessToken,
        query: normalizedQuery,
        limit: 8,
      });
      setUsers(response.data.users);
      setMessage(response.data.users.length === 0 ? "No users found." : null);
    } catch (error) {
      setUsers([]);
      setMessage(getErrorMessage(error));
    } finally {
      setIsSearching(false);
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
        <input
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, username, or email"
          type="search"
          value={query}
        />
        <button
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSearching}
          type="submit"
          title="Search users"
        >
          <Search className="size-4" />
        </button>
      </form>

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
                {user.username ? `@${user.username}` : user.profile?.headline ?? "User"}
              </p>
            </div>
          </article>
        ))}
        {message ? <p className="text-sm font-medium text-slate-500">{message}</p> : null}
      </div>
    </section>
  );
}
