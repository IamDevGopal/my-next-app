import { requestTaskApi as apiRequest } from "./task-request";

import type {
  AttachmentResponseData,
  AttachmentsResponseData,
} from "../types/attachment.type";
export type {
  AttachmentData,
  FileAttachmentData,
  AttachmentResponseData,
  AttachmentsResponseData,
} from "../types/attachment.type";
export type { PageInfoData } from "../types/task.type";

export function listTaskAttachments(
  accessToken: string,
  taskId: string,
  query: { limit?: number; cursor?: string | null } = {},
) {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 20));
  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  return apiRequest<AttachmentsResponseData>(
    `/tasks/${taskId}/attachments?${params.toString()}`,
    { method: "GET", accessToken },
  );
}

export function uploadTaskAttachment(
  accessToken: string,
  taskId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<AttachmentResponseData>(`/tasks/${taskId}/attachments`, {
    method: "POST",
    accessToken,
    body: formData,
  });
}

export function deleteTaskAttachment(
  accessToken: string,
  taskId: string,
  attachmentId: string,
) {
  return apiRequest<AttachmentResponseData>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
    { method: "DELETE", accessToken },
  );
}
