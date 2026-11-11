import type { PublicUserData } from "@/features/users/types/user.type";
import type { PageInfoData } from "./task.type";

export interface FileAttachmentData {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface AttachmentData {
  id: string;
  taskId: string;
  fileId: string;
  attachedBy: PublicUserData | null;
  createdAt: string;
  file: FileAttachmentData;
}

export interface AttachmentResponseData {
  attachment: AttachmentData;
}

export interface AttachmentsResponseData {
  attachments: AttachmentData[];
  pageInfo: PageInfoData;
}
