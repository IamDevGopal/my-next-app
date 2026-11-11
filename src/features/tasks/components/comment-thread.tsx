"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTaskComment,
  deleteTaskComment,
  listTaskCommentReplies,
  updateTaskComment,
} from "../api/comments.api";
import { useCommentPage } from "../hooks/use-comment-page";
import type { CommentData } from "../types/comment.type";
import type { TaskPermissionsData } from "../types/task.type";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

export function CommentThread({
  comment,
  accessToken,
  taskId,
  currentUserId,
  permissions,
  canModerate,
  focusedComment,
  onUpdate,
  onDelete,
  onUpdated,
}: {
  comment: CommentData;
  accessToken: string;
  taskId: string;
  currentUserId: string;
  permissions: TaskPermissionsData;
  canModerate: boolean;
  focusedComment?: CommentData | null;
  onUpdate: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdated?: () => void;
}) {
  const loader = useCallback(
    (cursor?: string | null) =>
      listTaskCommentReplies(accessToken, taskId, comment.id, cursor),
    [accessToken, taskId, comment.id],
  );
  const replies = useCommentPage(loader, {
    comments: comment.replies,
    pageInfo: comment.repliesPageInfo,
  });
  const { upsert } = replies;
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (focusedComment?.parentId === comment.id) upsert(focusedComment);
  }, [focusedComment, comment.id, upsert]);
  useEffect(() => {
    if (
      !focusedComment ||
      (focusedComment.id !== comment.id &&
        focusedComment.parentId !== comment.id)
    )
      return;
    document
      .getElementById("comment-" + focusedComment.id)
      ?.scrollIntoView({ block: "center" });
  }, [focusedComment, comment.id, replies.comments]);

  async function createReply(body: string) {
    const response = await createTaskComment(
      accessToken,
      taskId,
      body,
      comment.id,
    );
    replies.upsert(response.data.comment);
    setReplying(false);
    onUpdated?.();
  }
  async function updateReply(id: string, body: string) {
    const response = await updateTaskComment(accessToken, taskId, id, body);
    replies.upsert(response.data.comment);
    onUpdated?.();
  }
  async function deleteReply(id: string) {
    await deleteTaskComment(accessToken, taskId, id);
    replies.remove(id);
    onUpdated?.();
  }

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        isOwnComment={comment.authorId === currentUserId}
        canModerate={canModerate}
        canWrite={permissions.canComment}
        canAttach={permissions.canAttach}
        accessToken={accessToken}
        taskId={taskId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReply={() => setReplying((value) => !value)}
      />
      {replying && permissions.canComment ? (
        <div className="ml-4">
          <CommentForm
            onSubmit={createReply}
            onCancel={() => setReplying(false)}
            placeholder="Write a reply..."
          />
        </div>
      ) : null}
      <div className="ml-4 space-y-3 border-l border-slate-200 pl-3">
        {replies.comments.length ? (
          <button
            type="button"
            disabled={replies.loading}
            className="text-xs text-emerald-800 underline"
            onClick={() => void replies.load()}
          >
            Refresh replies
          </button>
        ) : null}
        {replies.comments.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            isOwnComment={reply.authorId === currentUserId}
            canModerate={canModerate}
            canWrite={permissions.canComment}
            canAttach={permissions.canAttach}
            accessToken={accessToken}
            taskId={taskId}
            onUpdate={updateReply}
            onDelete={deleteReply}
          />
        ))}
        {replies.error ? (
          <p role="alert" className="text-sm text-rose-700">
            {replies.error}
          </p>
        ) : null}
        {replies.pageInfo.hasNextPage ? (
          <button
            type="button"
            disabled={replies.loading}
            className="text-sm text-emerald-800 underline"
            onClick={() => void replies.load(replies.pageInfo.nextCursor)}
          >
            {replies.loading ? "Loading replies..." : "Load older replies"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
