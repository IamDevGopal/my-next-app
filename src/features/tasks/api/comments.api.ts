import { requestTaskApi as apiRequest } from "./task-request";
import type {
  CommentResponseData,
  CommentsResponseData,
  CommentAttachmentData,
} from "../types/comment.type";
export type {
  CommentData,
  CommentResponseData,
  CommentsResponseData,
} from "../types/comment.type";
export type { PageInfoData } from "../types/task.type";

export function listTaskComments(
  token: string,
  taskId: string,
  query: { limit?: number; cursor?: string | null } = {},
) {
  const params = new URLSearchParams({ limit: String(query.limit ?? 20) });
  if (query.cursor) params.set("cursor", query.cursor);
  return apiRequest<CommentsResponseData>(
    `/tasks/${taskId}/comments?${params}`,
    { method: "GET", accessToken: token },
  );
}

export function listTaskCommentReplies(
  token: string,
  taskId: string,
  commentId: string,
  cursor?: string | null,
) {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return apiRequest<CommentsResponseData>(
    `/tasks/${taskId}/comments/${commentId}/replies?${params}`,
    { method: "GET", accessToken: token },
  );
}

export function getTaskComment(
  token: string,
  taskId: string,
  commentId: string,
) {
  return apiRequest<CommentResponseData>(
    `/tasks/${taskId}/comments/${commentId}`,
    { method: "GET", accessToken: token },
  );
}

export function createTaskComment(
  token: string,
  taskId: string,
  body: string,
  parentId?: string,
) {
  return apiRequest<CommentResponseData>(`/tasks/${taskId}/comments`, {
    method: "POST",
    accessToken: token,
    body: { body, parentId },
  });
}

export function updateTaskComment(
  token: string,
  taskId: string,
  id: string,
  body: string,
) {
  return apiRequest<CommentResponseData>(`/tasks/${taskId}/comments/${id}`, {
    method: "PATCH",
    accessToken: token,
    body: { body },
  });
}

export function deleteTaskComment(token: string, taskId: string, id: string) {
  return apiRequest<CommentResponseData>(`/tasks/${taskId}/comments/${id}`, {
    method: "DELETE",
    accessToken: token,
  });
}

export function uploadCommentAttachment(
  token: string,
  taskId: string,
  commentId: string,
  file: File,
) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<{ attachment: CommentAttachmentData }>(
    `/tasks/${taskId}/comments/${commentId}/attachments`,
    { method: "POST", accessToken: token, body },
  );
}

export function deleteCommentAttachment(
  token: string,
  taskId: string,
  commentId: string,
  id: string,
) {
  return apiRequest<null>(
    `/tasks/${taskId}/comments/${commentId}/attachments/${id}`,
    { method: "DELETE", accessToken: token },
  );
}
