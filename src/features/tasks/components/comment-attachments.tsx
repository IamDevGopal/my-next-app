"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { formatFileSize } from "@/lib/format-file-size";
import {
  deleteCommentAttachment,
  uploadCommentAttachment,
} from "../api/comments.api";
import { downloadAttachment } from "../helpers/download-attachment.helper";
import type { CommentAttachmentData } from "../types/comment.type";
import { AttachmentUpload } from "./attachment-upload";

export function CommentAttachments({
  attachments,
  accessToken,
  taskId,
  commentId,
  canAttach,
}: {
  attachments: CommentAttachmentData[];
  accessToken: string;
  taskId: string;
  commentId: string;
  canAttach: boolean;
}) {
  const [links, setLinks] = useState(attachments);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLinks(attachments);
  }, [attachments]);

  async function download(link: CommentAttachmentData) {
    setBusy(link.id);
    setError(null);
    try {
      await downloadAttachment(
        `/tasks/${taskId}/comments/${commentId}/attachments/${link.id}/download`,
        accessToken,
        link.file.originalName,
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function remove(link: CommentAttachmentData) {
    setBusy(link.id);
    setError(null);
    try {
      await deleteCommentAttachment(accessToken, taskId, commentId, link.id);
      setLinks((current) => current.filter((row) => row.id !== link.id));
      setConfirmId(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {links.map((link) => (
        <div
          key={link.id}
          className="flex flex-wrap items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm"
        >
          <button
            type="button"
            disabled={busy !== null}
            className="min-w-0 flex-1 break-all text-left text-emerald-800 underline"
            onClick={() => void download(link)}
          >
            {link.file.originalName}{" "}
            <span className="text-xs text-slate-500">
              ({formatFileSize(link.file.sizeBytes)})
            </span>
          </button>
          {canAttach ? (
            confirmId === link.id ? (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void remove(link)}
                  className="text-rose-700"
                >
                  Confirm removal
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirmId(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setConfirmId(link.id)}
                className="text-rose-700"
              >
                Remove
              </button>
            )
          ) : null}
        </div>
      ))}
      {canAttach && links.length < 20 ? (
        <button
          type="button"
          className="text-xs font-medium text-emerald-800 underline"
          onClick={() => setUploading((value) => !value)}
        >
          {uploading ? "Close upload" : "Attach a file"}
        </button>
      ) : null}
      {canAttach && uploading ? (
        <AttachmentUpload
          accessToken={accessToken}
          taskId={taskId}
          disabled={busy !== null}
          onUploaded={() => setUploading(false)}
          onUpload={async (file) => {
            const response = await uploadCommentAttachment(
              accessToken,
              taskId,
              commentId,
              file,
            );
            setLinks((current) => [...current, response.data.attachment]);
          }}
        />
      ) : null}
    </div>
  );
}
