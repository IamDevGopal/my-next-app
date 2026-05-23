"use client";

import { Bell, Check, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../hooks/use-notifications";
import type { NotificationData } from "../types/notifications.type";

interface NotificationBellProps {
  accessToken: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ accessToken }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, markRead, markAllRead, remove } =
    useNotifications({ accessToken });

  // Close dropdown when clicking outside — standard popover UX.
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleItemClick(notification: NotificationData) {
    // Mark-read on open; we don't await — UI updates optimistically.
    if (notification.status === "UNREAD") {
      void markRead(notification.id);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label="Notifications"
        className="relative inline-flex size-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-950">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                  onClick={() => void markAllRead()}
                  type="button"
                >
                  <Check className="size-3" />
                  Mark all read
                </button>
              ) : null}
              <button
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                You&rsquo;re all caught up. Notifications will land here.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const isUnread = n.status === "UNREAD";
                  const Wrapper = n.link
                    ? ({ children }: { children: React.ReactNode }) => (
                        <Link
                          className="flex flex-1 items-start gap-3"
                          href={n.link!}
                          onClick={() => handleItemClick(n)}
                        >
                          {children}
                        </Link>
                      )
                    : ({ children }: { children: React.ReactNode }) => (
                        <button
                          className="flex flex-1 items-start gap-3 text-left"
                          onClick={() => handleItemClick(n)}
                          type="button"
                        >
                          {children}
                        </button>
                      );
                  return (
                    <li
                      className={`group flex gap-2 px-4 py-3 transition hover:bg-slate-50 ${
                        isUnread ? "bg-emerald-50/40" : ""
                      }`}
                      key={n.id}
                    >
                      <Wrapper>
                        <div className="mt-1 size-2 shrink-0">
                          {isUnread ? (
                            <span className="inline-block size-2 rounded-full bg-emerald-600" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm ${
                              isUnread
                                ? "font-semibold text-slate-950"
                                : "text-slate-700"
                            }`}
                          >
                            {n.title}
                          </p>
                          {n.body ? (
                            <p className="line-clamp-2 text-xs text-slate-500">
                              {n.body}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                      </Wrapper>
                      <button
                        aria-label="Dismiss"
                        className="invisible inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 group-hover:visible"
                        onClick={() => void remove(n.id)}
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
