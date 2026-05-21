"use client";

import { Download, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { env } from "@/config/env";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  deleteTaskAttachment,
  listTaskAttachments,
  type AttachmentData,
  type PageInfoData,
} from "../api/attachments.api";
import type { TaskPermissionsData } from "../types/task.type";
import { formatFileSize } from "@/lib/format-file-size";
import { AttachmentUpload } from "./attachment-upload";

interface AttachmentsPanelProps {
  accessToken: string;
  taskId: string;
  permissions: TaskPermissionsData;
  onUpdated: () => void;
}

export function AttachmentsPanel({
  accessToken,
  taskId,
  permissions,
  onUpdated,
}: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfoData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadMore, setIsLoadMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAttach = permissions.canAttach;

  useEffect(() => {
    void loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, taskId]);

  async function loadAttachments(cursor?: string | null) {
    if (!cursor) {
      setStatus("loading");
    } else {
      setIsLoadMore(true);
    }

    setMessage(null);

    try {
      const response = await listTaskAttachments(accessToken, taskId, {
        limit: 20,
        cursor,
      });
      setAttachments((current) =>
        cursor
          ? [...current, ...response.data.attachments]
          : response.data.attachments,
      );
      setPageInfo(response.data.pageInfo);
      setStatus("ready");
    } catch (error) {
      setMessage(getErrorMessage(error));
      setStatus(cursor ? "ready" : "error");
    } finally {
      setIsLoadMore(false);
    }
  }

  const handleUploaded = useCallback(() => {
    void loadAttachments();
    onUpdated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, taskId, onUpdated]);

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    try {
      await deleteTaskAttachment(accessToken, taskId, attachmentId);
      await loadAttachments();
      onUpdated();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(attachmentId: string, fileName: string) {
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}/attachments/${attachmentId}/download`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        setMessage("Failed to download file.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Failed to download file.");
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
          {status === "loading" ? (
            <Loader2 className="size-3.5 animate-spin text-slate-400" />
          ) : (
            <span className="text-xs text-slate-400">
              {attachments.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {message ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {message}
          </div>
        ) : null}

        {canAttach ? (
          <AttachmentUpload
            accessToken={accessToken}
            taskId={taskId}
            onUploaded={handleUploaded}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <Paperclip className="mx-auto size-5 text-slate-400" />
            <p className="mt-1 text-xs font-medium text-slate-500">
              {permissions.canRead
                ? "You can view attachments but cannot upload new ones."
                : "Attachments are not available for this task."}
            </p>
          </div>
        )}

        {status === "error" ? (
          <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-rose-700">
              Could not load attachments.
            </p>
            <button
              className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              onClick={() => void loadAttachments()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : status === "ready" && attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <Paperclip className="mx-auto size-5 text-slate-400" />
            <p className="mt-1 text-sm font-medium text-slate-600">
              No attachments yet
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {canAttach
                ? "Upload files to attach them to this task."
                : "Files will appear here once attached."}
            </p>
          </div>
        ) : null}

        {status === "ready" && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 transition hover:border-slate-200 hover:shadow-xs"
                key={attachment.id}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                  <Paperclip className="size-4 text-slate-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {attachment.file.originalName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(attachment.file.sizeBytes)}
                    {attachment.attachedBy
                      ? ` \u00B7 by ${attachment.attachedBy.name}`
                      : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    onClick={() =>
                      void handleDownload(
                        attachment.id,
                        attachment.file.originalName,
                      )
                    }
                    title="Download"
                    type="button"
                  >
                    <Download className="size-3.5" />
                  </button>
                  {canAttach ? (
                    <button
                      className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      disabled={deletingId === attachment.id}
                      onClick={() => void handleDelete(attachment.id)}
                      title="Delete"
                      type="button"
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {pageInfo?.hasNextPage ? (
              <div className="flex justify-center pt-1">
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                  disabled={isLoadMore}
                  onClick={() => void loadAttachments(pageInfo.nextCursor)}
                  type="button"
                >
                  {isLoadMore ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
