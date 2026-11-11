"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { mergeComments } from "../helpers/comment-list.helper";
import type { CommentData, CommentsResponseData } from "../types/comment.type";

type Loader = (
  cursor?: string | null,
) => Promise<{ data: CommentsResponseData }>;

export function useCommentPage(loader: Loader, initial?: CommentsResponseData) {
  const initialPage = useRef(initial);
  const [page, setPage] = useState<CommentsResponseData>(
    initial ?? {
      comments: [],
      pageInfo: { hasNextPage: false, nextCursor: null },
    },
  );
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const revision = useRef(0);
  const localWrites = useRef(
    new Map<string, { row: CommentData; revision: number }>(),
  );
  const removedIds = useRef(new Set<string>());

  const load = useCallback(
    async (cursor?: string | null) => {
      const request = ++sequence.current;
      const startedAtRevision = revision.current;
      setLoading(true);
      setError(null);
      try {
        const response = await loader(cursor);
        if (request !== sequence.current) return;
        setPage((current) => {
          const rows = response.data.comments.filter(
            (row) => !removedIds.current.has(row.id),
          );
          const changedDuringRead = [...localWrites.current.values()]
            .filter((write) => write.revision > startedAtRevision)
            .map((write) => write.row);
          return {
            comments: mergeComments(
              cursor ? current.comments : [],
              mergeComments(rows, changedDuringRead),
            ),
            pageInfo: response.data.pageInfo,
          };
        });
      } catch (cause) {
        if (request === sequence.current) setError(getErrorMessage(cause));
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    if (!initialPage.current) void load();
    return () => {
      sequence.current += 1;
    };
  }, [load]);

  const upsert = useCallback((comment: CommentData) => {
    localWrites.current.set(comment.id, {
      row: comment,
      revision: ++revision.current,
    });
    setPage((current) => ({
      ...current,
      comments: mergeComments(current.comments, [comment]),
    }));
  }, []);
  const remove = useCallback((id: string) => {
    revision.current += 1;
    removedIds.current.add(id);
    localWrites.current.delete(id);
    setPage((current) => ({
      ...current,
      comments: current.comments.filter((comment) => comment.id !== id),
    }));
  }, []);

  return { ...page, loading, error, load, upsert, remove };
}
