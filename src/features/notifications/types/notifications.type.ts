export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "TEAM_INVITATION"
  | "TEAM_JOIN_REQUEST"
  | "TEAM_JOIN_REQUEST_APPROVED"
  | "TEAM_JOIN_REQUEST_REJECTED"
  | "CHAT_REQUEST"
  | "CHAT_REQUEST_ACCEPTED"
  | "DIRECT_MESSAGE"
  | "TEAM_MESSAGE"
  | "MENTION"
  | "SYSTEM_ALERT";

export interface NotificationActorData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  actor: NotificationActorData | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPageData {
  notifications: NotificationData[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationPreferenceData {
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface NotificationPreferencesData {
  preferences: NotificationPreferenceData[];
}

export interface NotificationUnreadCountData {
  unreadCount: number;
}

export interface UpdatePreferenceInput {
  type: NotificationType;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}

// Socket payloads
export interface NotificationNewSocketEvent {
  notification: NotificationData;
}

export interface NotificationUpdatedSocketEvent {
  notificationId: string | null;
  status: string | null;
  bulk?: boolean;
  deleted?: boolean;
}
