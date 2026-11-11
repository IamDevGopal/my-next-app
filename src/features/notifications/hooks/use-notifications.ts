"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { env } from "@/config/env";
import { getAuthSessionVersion } from "@/features/auth/utils/auth-storage";
import { bindAuthenticatedSocket } from "@/features/auth/realtime/bind-authenticated-socket";
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
  enabled?: boolean;
}
interface Inbox {
  notifications: NotificationData[];
  unreadCount: number;
}
const emptyInbox: Inbox = { notifications: [], unreadCount: 0 };

/* Inbox rows and count update together; socket reconnects reconcile with persisted state. */
export function useNotifications({
  accessToken,
  enabled = true,
}: UseNotificationsOptions) {
  const [inbox, setInbox] = useState<Inbox>(emptyInbox);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requests = useRef(0);
  const ownerVersion = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const version = ownerVersion.current;
    if (!enabled || !accessToken || version !== getAuthSessionVersion()) return;
    const request = ++requests.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listNotifications(accessToken, { limit: 20 });
      if (request !== requests.current || version !== getAuthSessionVersion())
        return;
      setInbox({
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
      });
    } catch (err) {
      if (request === requests.current && version === getAuthSessionVersion())
        setError(
          err instanceof Error ? err.message : "Notifications could not load.",
        );
    } finally {
      if (request === requests.current && version === getAuthSessionVersion())
        setIsLoading(false);
    }
  }, [accessToken, enabled]);

  useEffect(() => {
    const version = getAuthSessionVersion();
    const changedAccount = ownerVersion.current !== version;
    ownerVersion.current = version;
    requests.current += 1;
    if (!enabled || !accessToken) {
      setInbox(emptyInbox);
      setIsLoading(false);
      return;
    }
    if (changedAccount) setInbox(emptyInbox);
    let live = true;
    let reconciliation: ReturnType<typeof setTimeout> | undefined;
    const current = () => live && version === getAuthSessionVersion();
    const reconcile = () => {
      clearTimeout(reconciliation);
      reconciliation = setTimeout(() => {
        if (current()) void refresh();
      }, 100);
    };
    queueMicrotask(() => {
      if (current()) void refresh();
    });
    const socket = io(env.NEXT_PUBLIC_WS_URL + "/realtime", {
      auth: { token: "Bearer " + accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socket.on("connect", reconcile);
    socket.on("notification:new", (event: NotificationNewSocketEvent) => {
      if (!current()) return;
      requests.current += 1;
      setInbox((previous) => {
        if (
          previous.notifications.some((row) => row.id === event.notification.id)
        )
          return previous;
        return {
          notifications: [event.notification, ...previous.notifications].slice(
            0,
            50,
          ),
          unreadCount:
            previous.unreadCount +
            (event.notification.status === "UNREAD" ? 1 : 0),
        };
      });
      reconcile();
    });
    socket.on(
      "notification:updated",
      (event: NotificationUpdatedSocketEvent) => {
        if (!current()) return;
        requests.current += 1;
        if (event.notificationId) {
          setInbox((previous) => {
            const row = previous.notifications.find(
              (value) => value.id === event.notificationId,
            );
            const unread = row?.status === "UNREAD";
            return {
              notifications: event.deleted
                ? previous.notifications.filter(
                    (value) => value.id !== event.notificationId,
                  )
                : previous.notifications.map((value) =>
                    value.id === event.notificationId && event.status === "READ"
                      ? { ...value, status: "READ" as const }
                      : value,
                  ),
              unreadCount: Math.max(
                0,
                previous.unreadCount -
                  (unread && (event.deleted || event.status === "READ")
                    ? 1
                    : 0),
              ),
            };
          });
        }
        reconcile();
      },
    );
    const unbindAuth = bindAuthenticatedSocket(socket, accessToken);
    return () => {
      live = false;
      requests.current += 1;
      clearTimeout(reconciliation);
      unbindAuth();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accessToken, enabled, refresh]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const version = ownerVersion.current;
      if (!accessToken || version !== getAuthSessionVersion()) return;
      requests.current += 1;
      setInbox((previous) => {
        const row = previous.notifications.find(
          (value) => value.id === notificationId,
        );
        return {
          notifications: previous.notifications.map((value) =>
            value.id === notificationId
              ? { ...value, status: "READ" as const }
              : value,
          ),
          unreadCount: Math.max(
            0,
            previous.unreadCount - (row?.status === "UNREAD" ? 1 : 0),
          ),
        };
      });
      try {
        await markNotificationRead(accessToken, notificationId);
        await refresh();
      } catch (err) {
        await refresh();
        if (version === getAuthSessionVersion())
          setError(
            err instanceof Error
              ? err.message
              : "Notification could not be marked read.",
          );
      }
    },
    [accessToken, refresh],
  );

  const markAllRead = useCallback(async () => {
    const version = ownerVersion.current;
    if (!accessToken || version !== getAuthSessionVersion()) return;
    requests.current += 1;
    try {
      await markAllNotificationsRead(accessToken);
      await refresh();
    } catch (err) {
      if (version === getAuthSessionVersion())
        setError(
          err instanceof Error
            ? err.message
            : "Notifications could not be marked read.",
        );
    }
  }, [accessToken, refresh]);

  const remove = useCallback(
    async (notificationId: string) => {
      const version = ownerVersion.current;
      if (!accessToken || version !== getAuthSessionVersion()) return;
      requests.current += 1;
      setInbox((previous) => {
        const removed = previous.notifications.find(
          (row) => row.id === notificationId,
        );
        return {
          notifications: previous.notifications.filter(
            (row) => row.id !== notificationId,
          ),
          unreadCount: Math.max(
            0,
            previous.unreadCount - (removed?.status === "UNREAD" ? 1 : 0),
          ),
        };
      });
      try {
        await deleteNotification(accessToken, notificationId);
        await refresh();
      } catch (err) {
        await refresh();
        if (version === getAuthSessionVersion())
          setError(
            err instanceof Error
              ? err.message
              : "Notification could not be dismissed.",
          );
      }
    },
    [accessToken, refresh],
  );

  return { ...inbox, isLoading, error, refresh, markRead, markAllRead, remove };
}
