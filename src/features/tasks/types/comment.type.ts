import type { PublicUserData } from "@/features/users/types/user.type";
import type { FileAttachmentData } from "./attachment.type";
import type { PageInfoData } from "./task.type";

export interface CommentAttachmentData {
  id: string;
  fileId: string;
  attachedById: string | null;
  createdAt: string;
  file: FileAttachmentData;
}

export interface CommentData {
  id: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: PublicUserData;
  attachments: CommentAttachmentData[];
  replies: CommentData[];
  repliesPageInfo: PageInfoData;
}

export interface CommentsResponseData {
  comments: CommentData[];
  pageInfo: PageInfoData;
}
export interface CommentResponseData {
  comment: CommentData;
}
