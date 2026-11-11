"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  createTaskComment,
  deleteTaskComment,
  getTaskComment,
  listTaskComments,
  updateTaskComment,
} from "../api/comments.api";
import { useCommentPage } from "../hooks/use-comment-page";
import type { CommentData } from "../types/comment.type";
import type { TaskPermissionsData } from "../types/task.type";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";

interface CommentsPanelProps {
  accessToken: string;
  taskId: string;
  currentUserId: string;
  permissions: TaskPermissionsData;
  teamRole: string | null;
  onUpdated?: () => void;
}

export function CommentsPanel(props: CommentsPanelProps) {
  return (
    <CommentsPanelContent
      key={props.currentUserId + ":" + props.taskId}
      {...props}
    />
  );
}

function CommentsPanelContent({
  accessToken,
  taskId,
  currentUserId,
  permissions,
  teamRole,
  onUpdated,
}: CommentsPanelProps) {
  const loader = useCallback(
    (cursor?: string | null) =>
      listTaskComments(accessToken, taskId, { cursor, limit: 20 }),
    [accessToken, taskId],
  );
  const page = useCommentPage(loader);
  const { upsert, loading } = page;
  const [focusedComment, setFocusedComment] = useState<CommentData | null>(
    null,
  );
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let current = true;
    async function openLinkedComment() {
      const match = /^#comment-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (!match) return;
      try {
        const target = (await getTaskComment(accessToken, taskId, match[1]))
          .data.comment;
        const root = target.parentId
          ? (await getTaskComment(accessToken, taskId, target.parentId)).data
              .comment
          : target;
        if (current) {
          upsert(root);
          setFocusedComment(target);
          setLinkError(null);
        }
      } catch (cause) {
        if (current) setLinkError(getErrorMessage(cause));
      }
    }
    void openLinkedComment();
    window.addEventListener("hashchange", openLinkedComment);
    return () => {
      current = false;
      window.removeEventListener("hashchange", openLinkedComment);
    };
  }, [accessToken, taskId, loading, upsert]);

  async function create(body: string) {
    const response = await createTaskComment(accessToken, taskId, body);
    page.upsert(response.data.comment);
    onUpdated?.();
  }
  async function update(id: string, body: string) {
    const response = await updateTaskComment(accessToken, taskId, id, body);
    page.upsert(response.data.comment);
    onUpdated?.();
  }
  async function remove(id: string) {
    await deleteTaskComment(accessToken, taskId, id);
    page.remove(id);
    onUpdated?.();
  }

  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      aria-label="Task comments"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">Comments</h3>
        <button
          type="button"
          disabled={loading}
          className="text-xs text-emerald-800 underline"
          onClick={() => void page.load()}
        >
          Refresh comments
        </button>
        <span className="text-xs text-slate-500">
          {page.comments.length} discussions loaded
        </span>
      </div>
      {permissions.canComment ? (
        <CommentForm
          onSubmit={create}
          placeholder="Write a comment. Mention someone with @username..."
        />
      ) : (
        <p className="text-sm text-slate-500">You can read this discussion.</p>
      )}
      {page.error || linkError ? (
        <div role="alert" className="space-y-2 text-sm text-rose-700">
          <p>{page.error ?? linkError}</p>
          <button
            type="button"
            disabled={loading}
            className="underline"
            onClick={() => void page.load()}
          >
            Refresh comments
          </button>
        </div>
      ) : null}
      {loading && !page.comments.length ? (
        <p role="status" className="text-sm text-slate-500">
          Loading comments...
        </p>
      ) : null}
      {!loading && !page.error && !page.comments.length ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : null}
      {focusedComment ? (
        <p className="text-xs text-slate-500">
          The linked discussion is included below.
        </p>
      ) : null}
      {page.comments.map((comment) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          accessToken={accessToken}
          taskId={taskId}
          currentUserId={currentUserId}
          permissions={permissions}
          canModerate={teamRole === "OWNER"}
          focusedComment={focusedComment}
          onUpdate={update}
          onDelete={remove}
          onUpdated={onUpdated}
        />
      ))}
      {page.pageInfo.hasNextPage ? (
        <button
          type="button"
          disabled={loading}
          className="text-sm text-emerald-800 underline"
          onClick={() => void page.load(page.pageInfo.nextCursor)}
        >
          {loading ? "Loading..." : "Load older discussions"}
        </button>
      ) : null}
    </section>
  );
}
