import { apiRequest } from "@/lib/http/api-client";
import type {
  MarkReadData,
  TeamChatMessageResponseData,
  TeamChatMessagesResponseData,
} from "../types/chat.type";

interface MessagesQuery {
  limit?: number;
  cursor?: string | null;
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

export function listTeamChatMessages(
  accessToken: string,
  teamId: string,
  query: MessagesQuery = {},
) {
  const params = toSearchParams({ limit: 30, ...query });

  return apiRequest<TeamChatMessagesResponseData>(
    `/teams/${teamId}/chat/messages?${params}`,
    { method: "GET", accessToken },
  );
}

export function sendTeamChatMessage(
  accessToken: string,
  teamId: string,
  body: string,
) {
  return apiRequest<TeamChatMessageResponseData>(`/teams/${teamId}/chat/messages`, {
    method: "POST",
    accessToken,
    body: { body },
  });
}

export function deleteTeamChatMessage(
  accessToken: string,
  teamId: string,
  messageId: string,
) {
  return apiRequest<TeamChatMessageResponseData>(
    `/teams/${teamId}/chat/messages/${messageId}`,
    { method: "DELETE", accessToken },
  );
}

export function markTeamChatRead(
  accessToken: string,
  teamId: string,
  messageIds: string[],
) {
  return apiRequest<MarkReadData>(`/teams/${teamId}/chat/read`, {
    method: "PATCH",
    accessToken,
    body: { messageIds },
  });
}

export function uploadTeamChatAttachment(
  accessToken: string,
  teamId: string,
  file: File,
) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<TeamChatMessageResponseData>(`/teams/${teamId}/chat/attachments`, {
    method: "POST",
    accessToken,
    body,
  });
}
