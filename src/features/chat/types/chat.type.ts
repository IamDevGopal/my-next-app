import type { PublicUserData } from "@/features/users/types/user.type";

// ── Shared Pagination ──

export interface PageInfoData {
  nextCursor: string | null;
  hasNextPage: boolean;
}

// ── Enums ──

export type ChatRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";
export type DirectChatStatus = "ACTIVE" | "BLOCKED" | "CLOSED";
export type MessageType = "TEXT" | "FILE" | "SYSTEM";

// ── Chat Request Types ──

export interface ChatRequestData {
  id: string;
  requester: PublicUserData;
  recipient: PublicUserData;
  message: string | null;
  status: ChatRequestStatus;
  expiresAt: string | null;
  createdAt: string;
}

export interface ChatRequestResponseData {
  request: ChatRequestData;
}

export interface ChatRequestsResponseData {
  requests: ChatRequestData[];
  pageInfo?: PageInfoData;
}

// ── User Block Types ──

export interface BlockedUserData {
  id: string;
  blockedUser: PublicUserData;
  reason: string | null;
  createdAt: string;
}

export interface UserBlockResponseData {
  blockedUser: BlockedUserData;
}

export interface BlockedUsersResponseData {
  blockedUsers: BlockedUserData[];
}

// ── Direct Chat Types ──

export interface MessagePreviewData {
  id: string;
  body: string | null;
  messageType: MessageType;
  senderId: string;
  createdAt: string;
}

export interface DirectChatSummaryData {
  id: string;
  participant: PublicUserData;
  lastMessage: MessagePreviewData | null;
  unreadCount: number;
  status: DirectChatStatus;
  updatedAt: string;
}

export interface DirectChatsResponseData {
  chats: DirectChatSummaryData[];
  pageInfo?: PageInfoData;
}

// ── Message Types ──

export interface AttachmentData {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
}

export interface MessageData {
  id: string;
  sender: PublicUserData;
  body: string | null;
  messageType: MessageType;
  attachments: AttachmentData[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface MessageResponseData {
  message: MessageData;
}

export interface MessagesResponseData {
  messages: MessageData[];
  pageInfo?: PageInfoData;
}

// ── Mark Read ──

export interface MarkReadData {
  count: number;
}

// ── Team Chat Types ──

export interface TeamChatMessageData {
  id: string;
  sender: PublicUserData;
  body: string | null;
  messageType: MessageType;
  attachments: AttachmentData[];
  createdAt: string;
  deletedAt: string | null;
}

export interface TeamChatMessagesResponseData {
  messages: TeamChatMessageData[];
  pageInfo?: PageInfoData;
}

export interface TeamChatMessageResponseData {
  message: TeamChatMessageData;
}
