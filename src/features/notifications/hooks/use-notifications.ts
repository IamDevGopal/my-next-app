"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "../api/notifications.api";
import type {
  NotificationData,
  NotificationNewSocketEvent,
  NotificationUpdatedSocketEvent,
} from "../types/notifications.type";

interface UseNotificationsOptions {
  accessToken: string;
  // When false, the hook stays idle (used during the brief moment between
  // login and access-token availability).
  enabled?: boolean;
}

/**
 * Owns the notification feed for the bell + dropdown.
 *
 * Responsibilities:
 *   1. Initial fetch of the latest page from `/notifications`
 *   2. Opens its own Socket.IO connection to `/realtime` so the bell stays
 *      live even on pages that don't otherwise mount a chat socket. We
 *      cannot reuse `useChatSocket` because that hook's listeners are scoped
 *      to chat events; coupling the bell to it would require chat to be
 *      mounted everywhere.
 *   3. Patches local state on `notification:new` and `notification:updated`
 *      events so dropdowns across tabs stay in sync.
 *   4. Exposes mutation actions (mark read, mark all, delete) that hit the
 *      REST endpoints and apply optimistic UI updates.
 */
export function useNotifications({
  accessToken,
  enabled = true,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Initial fetch ──
  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listNotifications(accessToken, { limit: 20 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    // refresh() triggers setState (loading + data). The "no setState in
    // effect" rule is well-meaning but the alternative (Suspense/SWR) is
    // overkill for a simple on-mount fetch. Defer via microtask to keep
    // the rule happy and avoid the cascading-render warning.
    queueMicrotask(() => {
      void refresh();
    });
  }, [accessToken, enabled, refresh]);

  // ── Socket subscription ──
  useEffect(() => {
    if (!enabled || !accessToken) return;

    const socket: Socket = io(`${env.NEXT_PUBLIC_WS_URL}/realtime`, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("notification:new", (event: NotificationNewSocketEvent) => {
      setNotifications((prev) => {
        // De-dup by id — REST polling and socket push may race on a freshly
        // sent notification (e.g. immediately after a chat message lands).
        if (prev.some((n) => n.id === event.notification.id)) return prev;
        return [event.notification, ...prev];
      });
      if (event.notification.status === "UNREAD") {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on(
      "notification:updated",
      (event: NotificationUpdatedSocketEvent) => {
        if (event.deleted) {
          if (event.notificationId) {
            setNotifications((prev) => {
              const removed = prev.find((n) => n.id === event.notificationId);
              if (removed && removed.status === "UNREAD") {
                setUnreadCount((c) => Math.max(0, c - 1));
              }
              return prev.filter((n) => n.id !== event.notificationId);
            });
          }
          return;
        }
        if (event.bulk) {
          // Mark-all-read event
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, status: "READ" as const })),
          );
          setUnreadCount(0);
          return;
        }
        if (event.notificationId && event.status === "READ") {
          setNotifications((prev) => {
            const target = prev.find((n) => n.id === event.notificationId);
            if (target && target.status === "UNREAD") {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
            return prev.map((n) =>
              n.id === event.notificationId
                ? { ...n, status: "READ" as const }
                : n,
            );
          });
        }
      },
    );

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, enabled]);

  // ── Mutations ──
  const markRead = useCallback(
    async (notificationId: string) => {
      if (!accessToken) return;
      // Optimistic — server emits `notification:updated` which would also
      // patch state, but the bell needs to feel instant.
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === notificationId);
        if (target && target.status === "UNREAD") {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.map((n) =>
          n.id === notificationId ? { ...n, status: "READ" as const } : n,
        );
      });
      try {
        await markNotificationRead(accessToken, notificationId);
      } catch {
        // Roll back is messy without a snapshot; on failure just refresh.
        await refresh();
      }
    },
    [accessToken, refresh],
  );

  const markAllRead = useCallback(async () => {
    if (!accessToken) return;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "READ" as const })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(accessToken);
    } catch {
      await refresh();
    }
  }, [accessToken, refresh]);

  const remove = useCallback(
    async (notificationId: string) => {
      if (!accessToken) return;
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === notificationId);
        if (removed && removed.status === "UNREAD") {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
      try {
        await deleteNotification(accessToken, notificationId);
      } catch {
        await refresh();
      }
    },
    [accessToken, refresh],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markRead,
    markAllRead,
    remove,
  };
}
