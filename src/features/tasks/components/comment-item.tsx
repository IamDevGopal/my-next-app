"use client";

import { CheckCircle2, Edit3, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import type { CommentData } from "../api/comments.api";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: CommentData;
  isOwnComment: boolean;
  canModerate: boolean;
  onUpdate: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentItem({
  comment,
  isOwnComment,
  canModerate,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (comment.deletedAt) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm italic text-slate-400">
          This comment has been deleted.
        </p>
      </div>
    );
  }

  async function handleUpdate(body: string) {
    await onUpdate(comment.id, body);
    setIsEditing(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="group rounded-lg border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            avatarUrl={comment.author.avatarUrl}
            name={comment.author.name}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {comment.author.name}
            </p>
            <p className="text-xs text-slate-400">
              {formatCommentTime(comment.createdAt)}
              {comment.editedAt ? " (edited)" : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {isOwnComment && !isEditing ? (
            <button
              className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setIsEditing(true)}
              title="Edit comment"
              type="button"
            >
              <Edit3 className="size-3.5" />
            </button>
          ) : null}
          {(isOwnComment || canModerate) && !isEditing ? (
            <button
              className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete comment"
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3">
          <CommentForm
            initialValue={comment.body}
            isEditing
            onCancel={() => setIsEditing(false)}
            onSubmit={handleUpdate}
            placeholder="Edit your comment..."
          />
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {comment.body}
        </p>
      )}

      {showDeleteConfirm ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
          <Trash2 className="size-4 shrink-0 text-rose-500" />
          <p className="flex-1 text-xs font-medium text-rose-700">
            Delete this comment?
          </p>
          <button
            className="inline-flex h-7 items-center justify-center rounded-md border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-70"
            disabled={isDeleting}
            onClick={() => setShowDeleteConfirm(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-70"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatCommentTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
