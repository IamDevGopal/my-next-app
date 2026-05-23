"use client";

import { Loader2, Shield, ShieldOff, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { listBlockedUsers, unblockUser } from "../api/chat.api";
import type { BlockedUserData } from "../types/chat.type";

// ── Types ──

interface UserBlocksPanelProps {
  accessToken: string;
  onError: (error: string | null) => void;
}

// ── Component ──

export function UserBlocksPanel({ accessToken, onError }: UserBlocksPanelProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await listBlockedUsers(accessToken);
        if (cancelled) return;
        setBlockedUsers(response.data.blockedUsers);
      } catch (error) {
        if (cancelled) return;
        onError(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleUnblock(userId: string) {
    setBusyUserId(userId);

    try {
      await unblockUser(accessToken, userId);
      setBlockedUsers((current) => current.filter((b) => b.blockedUser.id !== userId));
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Blocked Users</h3>
        <ShieldOff className="size-5 text-slate-400" />
      </div>
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center">
            <Shield className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">No blocked users</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Blocked users cannot send you chat requests or messages.
            </p>
          </div>
        ) : (
          blockedUsers.map((block) => (
            <div
              className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-slate-50 p-2"
              key={block.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar
                  avatarUrl={block.blockedUser.avatarUrl}
                  name={block.blockedUser.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-950">
                    {block.blockedUser.name}
                  </p>
                  {block.reason ? (
                    <p className="truncate text-[10px] text-slate-500">{block.reason}</p>
                  ) : null}
                </div>
              </div>
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                disabled={busyUserId === block.blockedUser.id}
                onClick={() => void handleUnblock(block.blockedUser.id)}
                type="button"
              >
                {busyUserId === block.blockedUser.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <UserX className="size-3" />
                )}
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
