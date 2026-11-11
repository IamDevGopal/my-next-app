"use client";

import { useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { formatTaskTime } from "../helpers/task-time.helper";
import type { CommentData } from "../types/comment.type";
import { CommentForm } from "./comment-form";
import { CommentAttachments } from "./comment-attachments";

interface CommentItemProps {
  comment: CommentData;
  isOwnComment: boolean;
  canModerate: boolean;
  canWrite: boolean;
  canAttach: boolean;
  accessToken: string;
  taskId: string;
  onUpdate: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReply?: () => void;
}

export function CommentItem({
  comment,
  isOwnComment,
  canModerate,
  canWrite,
  canAttach,
  accessToken,
  taskId,
  onUpdate,
  onDelete,
  onReply,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(comment.id);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }
  async function update(body: string) {
    await onUpdate(comment.id, body);
    setEditing(false);
  }

  return (
    <article
      id={"comment-" + comment.id}
      className="scroll-mt-6 rounded-lg border border-slate-200 bg-white p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            avatarUrl={comment.author.avatarUrl}
            name={comment.author.name}
            size="sm"
          />
          <div>
            <p className="text-sm font-semibold">{comment.author.name}</p>
            <time
              dateTime={comment.createdAt}
              className="text-xs text-slate-500"
            >
              {formatTaskTime(comment.createdAt)}
              {comment.editedAt ? " (edited)" : ""}
            </time>
          </div>
        </div>
        {canWrite && !editing ? (
          <div className="flex gap-3 text-xs">
            {onReply ? (
              <button
                type="button"
                className="text-emerald-800 underline"
                onClick={onReply}
              >
                Reply
              </button>
            ) : null}
            {isOwnComment ? (
              <button
                type="button"
                className="text-slate-700 underline"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : null}
            {isOwnComment || canModerate ? (
              <button
                type="button"
                className="text-rose-700 underline"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {editing && canWrite ? (
        <div className="mt-3">
          <CommentForm
            initialValue={comment.body}
            isEditing
            onSubmit={update}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {comment.body}
        </p>
      )}
      <CommentAttachments
        attachments={comment.attachments}
        accessToken={accessToken}
        taskId={taskId}
        commentId={comment.id}
        canAttach={canAttach}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {confirmDelete && canWrite ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded bg-rose-50 p-3 text-sm">
          <p>
            {comment.parentId
              ? "Delete this reply and its attachments?"
              : "Delete this discussion, replies and attachments?"}
          </p>
          <button
            type="button"
            disabled={deleting}
            className="text-rose-800 underline"
            onClick={() => void remove()}
          >
            {deleting ? "Deleting..." : "Confirm delete"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </article>
  );
}
