import { apiRequest } from "@/lib/http/api-client";

export interface FileAttachmentData {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface AttachmentAuthorData {
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

export interface AttachmentData {
  id: string;
  taskId: string;
  fileId: string;
  attachedBy: AttachmentAuthorData | null;
  createdAt: string;
  file: FileAttachmentData;
}

export interface PageInfoData {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface AttachmentResponseData {
  attachment: AttachmentData;
}

export interface AttachmentsResponseData {
  attachments: AttachmentData[];
  pageInfo: PageInfoData;
}

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

  return apiRequest<AttachmentResponseData>(
    `/tasks/${taskId}/attachments`,
    {
      method: "POST",
      accessToken,
      body: formData,
    },
  );
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

