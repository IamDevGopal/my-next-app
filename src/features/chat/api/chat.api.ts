import { apiRequest } from "@/lib/http/api-client";
import type {
  BlockedUsersResponseData,
  ChatRequestResponseData,
  ChatRequestsResponseData,
  DirectChatsResponseData,
  MarkReadData,
  MessageResponseData,
  MessagesResponseData,
  UserBlockResponseData,
} from "../types/chat.type";

// ── Query Helpers ──

interface CursorQuery {
  limit?: number;
  cursor?: string | null;
}

interface ChatRequestsQuery extends CursorQuery {
  status?: string;
  direction?: "sent" | "received";
}

interface MessagesQuery extends CursorQuery {
  before?: string;
}

function toSearchParams(
  query: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

// ── Chat Requests API ──

export function sendChatRequest(
  accessToken: string,
  recipientId: string,
  message?: string | null,
) {
  return apiRequest<ChatRequestResponseData>("/chat-requests", {
    method: "POST",
    accessToken,
    body: { recipientId, message: message ?? null },
  });
}

export function listChatRequests(
  accessToken: string,
  query: ChatRequestsQuery = {},
) {
  const params = toSearchParams({ limit: 20, direction: "received", ...query });

  return apiRequest<ChatRequestsResponseData>(`/chat-requests?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function acceptChatRequest(accessToken: string, requestId: string) {
  return apiRequest<ChatRequestResponseData>(
    `/chat-requests/${requestId}/accept`,
    { method: "POST", accessToken },
  );
}

export function rejectChatRequest(accessToken: string, requestId: string) {
  return apiRequest<ChatRequestResponseData>(
    `/chat-requests/${requestId}/reject`,
    { method: "POST", accessToken },
  );
}

export function cancelChatRequest(accessToken: string, requestId: string) {
  return apiRequest<ChatRequestResponseData>(
    `/chat-requests/${requestId}/cancel`,
    { method: "POST", accessToken },
  );
}

// ── Direct Chats API ──

export function listDirectChats(
  accessToken: string,
  query: CursorQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<DirectChatsResponseData>(`/direct-chats?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function sendDirectMessage(
  accessToken: string,
  chatId: string,
  body: string,
) {
  return apiRequest<MessageResponseData>(
    `/direct-chats/${chatId}/messages`,
    { method: "POST", accessToken, body: { body } },
  );
}

export function listDirectMessages(
  accessToken: string,
  chatId: string,
  query: MessagesQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<MessagesResponseData>(
    `/direct-chats/${chatId}/messages?${params}`,
    { method: "GET", accessToken },
  );
}

export function deleteDirectMessage(
  accessToken: string,
  chatId: string,
  messageId: string,
) {
  return apiRequest<MessageResponseData>(
    `/direct-chats/${chatId}/messages/${messageId}`,
    { method: "DELETE", accessToken },
  );
}

export function markChatRead(
  accessToken: string,
  chatId: string,
  messageIds: string[],
) {
  return apiRequest<MarkReadData>(`/direct-chats/${chatId}/read`, {
    method: "PATCH",
    accessToken,
    body: { messageIds },
  });
}

export function uploadChatAttachment(
  accessToken: string,
  chatId: string,
  file: File,
) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<MessageResponseData>(
    `/direct-chats/${chatId}/attachments`,
    { method: "POST", accessToken, body },
  );
}

// ── User Blocks API ──

export function blockUser(accessToken: string, userId: string) {
  return apiRequest<UserBlockResponseData>(`/users/${userId}/block`, {
    method: "POST",
    accessToken,
  });
}

export function unblockUser(accessToken: string, userId: string) {
  return apiRequest<UserBlockResponseData>(`/users/${userId}/block`, {
    method: "DELETE",
    accessToken,
  });
}

export function listBlockedUsers(accessToken: string) {
  return apiRequest<BlockedUsersResponseData>("/users/blocks", {
    method: "GET",
    accessToken,
  });
}
