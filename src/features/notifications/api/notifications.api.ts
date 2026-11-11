import { apiRequest as requestApi } from "@/lib/http/api-client";
import type {
  NotificationPageData,
  NotificationData,
  NotificationPreferencesData,
  NotificationUnreadCountData,
  PushPublicKeyData,
  PushSubscriptionInput,
  PushSubscriptionsData,
  UpdatePreferenceInput,
} from "../types/notifications.type";

function apiRequest<T>(
  path: string,
  options: {
    accessToken: string;
    method: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => {
        controller.abort();
        reject(
          new Error(
            "Notification request timed out. Refresh settings before retrying a change.",
          ),
        );
      },
      options.method === "GET" ? 15000 : 20000,
    );
  });
  return Promise.race([
    requestApi<T>(path, { ...options, signal: controller.signal }),
    deadline,
  ]).finally(() => clearTimeout(timer));
}

interface ListQuery {
  cursor?: string | null;
  limit?: number;
  status?: "UNREAD" | "READ" | "ARCHIVED";
  type?: string;
}

function buildQueryString(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function listNotifications(accessToken: string, query: ListQuery = {}) {
  return apiRequest<NotificationPageData>(
    `/notifications${buildQueryString(query)}`,
    {
      method: "GET",
      accessToken,
    },
  );
}

export function getUnreadCount(accessToken: string) {
  return apiRequest<NotificationUnreadCountData>(
    "/notifications/unread-count",
    { method: "GET", accessToken },
  );
}

export function markNotificationRead(
  accessToken: string,
  notificationId: string,
) {
  return apiRequest<NotificationData>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    accessToken,
  });
}

export function markAllNotificationsRead(accessToken: string) {
  return apiRequest<Record<string, never>>("/notifications/read-all", {
    method: "PATCH",
    accessToken,
  });
}

export function deleteNotification(
  accessToken: string,
  notificationId: string,
) {
  return apiRequest<Record<string, never>>(`/notifications/${notificationId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function getNotificationPreferences(accessToken: string) {
  return apiRequest<NotificationPreferencesData>("/notifications/preferences", {
    method: "GET",
    accessToken,
  });
}

export function updateNotificationPreferences(
  accessToken: string,
  preferences: UpdatePreferenceInput[],
) {
  return apiRequest<NotificationPreferencesData>("/notifications/preferences", {
    method: "PATCH",
    accessToken,
    body: { preferences },
  });
}

export function getBrowserPushPublicKey(accessToken: string) {
  return apiRequest<PushPublicKeyData>("/notifications/push/public-key", {
    method: "GET",
    accessToken,
  });
}

export function listBrowserPushSubscriptions(accessToken: string) {
  return apiRequest<PushSubscriptionsData>(
    "/notifications/push-subscriptions",
    {
      method: "GET",
      accessToken,
    },
  );
}

export function registerBrowserPushSubscription(
  accessToken: string,
  subscription: PushSubscriptionInput,
) {
  return apiRequest<PushSubscriptionsData>(
    "/notifications/push-subscriptions",
    {
      method: "POST",
      accessToken,
      body: subscription,
    },
  );
}

export function removeBrowserPushSubscription(
  accessToken: string,
  endpoint: string,
) {
  return apiRequest<Record<string, never>>(
    "/notifications/push-subscriptions",
    {
      method: "DELETE",
      accessToken,
      body: { endpoint },
    },
  );
}
