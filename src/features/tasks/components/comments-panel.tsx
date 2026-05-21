"use client";

import { Loader2, MessageSquare, MessageSquareOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
  type CommentData,
  type PageInfoData,
} from "../api/comments.api";
import type { TaskPermissionsData } from "../types/task.type";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

interface CommentsPanelProps {
  accessToken: string;
  taskId: string;
  currentUserId: string;
  permissions: TaskPermissionsData;
  teamRole: string | null;
}

export function CommentsPanel({
  accessToken,
  taskId,
  currentUserId,
  permissions,
  teamRole,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfoData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadMore, setIsLoadMore] = useState(false);

  const canComment = permissions.canComment;
  const canModerate = teamRole === "OWNER";

  useEffect(() => {
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, taskId]);

  async function loadComments(cursor?: string | null) {
    if (!cursor) {
      setStatus("loading");
    } else {
      setIsLoadMore(true);
    }

    setMessage(null);

    try {
      const response = await listTaskComments(accessToken, taskId, {
        limit: 20,
        cursor,
      });
      setComments((current) =>
        cursor ? [...current, ...response.data.comments] : response.data.comments,
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

  const handleCreate = useCallback(
    async (body: string) => {
      await createTaskComment(accessToken, taskId, body);
      await loadComments();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessToken, taskId],
  );

  const handleUpdate = useCallback(
    async (commentId: string, body: string) => {
      await updateTaskComment(accessToken, taskId, commentId, body);
      await loadComments();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessToken, taskId],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      await deleteTaskComment(accessToken, taskId, commentId);
      await loadComments();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessToken, taskId],
  );

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Comments</h3>
          {status === "loading" ? (
            <Loader2 className="size-3.5 animate-spin text-slate-400" />
          ) : (
            <span className="text-xs text-slate-400">
              {comments.length}
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

        {canComment ? (
          <CommentForm
            onSubmit={handleCreate}
            placeholder="Write a comment..."
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <MessageSquareOff className="mx-auto size-5 text-slate-400" />
            <p className="mt-1 text-xs font-medium text-slate-500">
              {permissions.canRead
                ? "You can read comments but cannot add new ones."
                : "Comments are not available for this task."}
            </p>
          </div>
        )}

        {status === "error" ? (
          <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-rose-700">
              Could not load comments.
            </p>
            <button
              className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              onClick={() => void loadComments()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : status === "ready" && comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <MessageSquare className="mx-auto size-5 text-slate-400" />
            <p className="mt-1 text-sm font-medium text-slate-600">
              No comments yet
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {canComment
                ? "Start the discussion by adding the first comment."
                : "Comments will appear here once added."}
            </p>
          </div>
        ) : null}

        {status === "ready" && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                canModerate={canModerate}
                comment={comment}
                isOwnComment={comment.authorId === currentUserId}
                key={comment.id}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}

            {pageInfo?.hasNextPage ? (
              <div className="flex justify-center pt-1">
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                  disabled={isLoadMore}
                  onClick={() => void loadComments(pageInfo.nextCursor)}
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
