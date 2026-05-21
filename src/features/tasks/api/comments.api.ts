import { apiRequest } from "@/lib/http/api-client";

export interface CommentAuthorData {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  lastSeenAt: string | null;
  profile: {
    headline: string | null;
    location: string | null;
    company: string | null;
  } | null;
}

export interface CommentData {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthorData;
}

export interface PageInfoData {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface CommentResponseData {
  comment: CommentData;
}

export interface CommentsResponseData {
  comments: CommentData[];
  pageInfo: PageInfoData;
}

export function listTaskComments(
  accessToken: string,
  taskId: string,
  query: { limit?: number; cursor?: string | null } = {},
) {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 20));
  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  return apiRequest<CommentsResponseData>(
    `/tasks/${taskId}/comments?${params.toString()}`,
    { method: "GET", accessToken },
  );
}

export function createTaskComment(
  accessToken: string,
  taskId: string,
  body: string,
) {
  return apiRequest<CommentResponseData>(`/tasks/${taskId}/comments`, {
    method: "POST",
    accessToken,
    body: { body },
  });
}

export function updateTaskComment(
  accessToken: string,
  taskId: string,
  commentId: string,
  body: string,
) {
  return apiRequest<CommentResponseData>(
    `/tasks/${taskId}/comments/${commentId}`,
    { method: "PATCH", accessToken, body: { body } },
  );
}

export function deleteTaskComment(
  accessToken: string,
  taskId: string,
  commentId: string,
) {
  return apiRequest<CommentResponseData>(
    `/tasks/${taskId}/comments/${commentId}`,
    { method: "DELETE", accessToken },
  );
}
