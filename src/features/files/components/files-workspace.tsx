"use client";

import { FileText, FolderOpen, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { listFiles } from "../api/files.api";
import type { FileRecord } from "../types/files.type";
import { FileBrowser } from "./file-browser";

// ── Types ──

interface FilesWorkspaceProps {
  accessToken: string;
}

type LoadStatus = "loading" | "ready" | "error";
const FILES_PAGE_SIZE = 20;

// ── Component ──

export function FilesWorkspace({ accessToken }: FilesWorkspaceProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(FILES_PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadedForToken, setLoadedForToken] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadFiles = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setError(null);
    setStatus("loading");
    try {
      const response = await listFiles(accessToken, {
        page,
        limit: FILES_PAGE_SIZE,
      });
      if (currentRequest !== requestId.current) return;
      setFiles(response.data.files);
      setTotal(response.data.total);
      setPage(response.data.page);
      setLimit(response.data.limit);
      setLoadedForToken(accessToken);
      setStatus("ready");
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(getErrorMessage(err));
      setStatus("error");
    }
  }, [accessToken, page]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await loadFiles();
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleFileDeleted(fileId: string) {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
    setTotal((previous) => Math.max(0, previous - 1));
    if (files.length === 1 && page > 1) setPage((previous) => previous - 1);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <FileText className="size-4" />
              Files
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              My files
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse files you have attached to tasks, comments, and chat
              messages.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isRefreshing || status === "loading"}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCcw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="px-3 py-3 sm:px-5">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        </div>
      ) : null}

      {/* File List */}
      <div className="px-3 py-4 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <FolderOpen className="size-3" />
          All files ({total})
        </div>
        <div className="mt-3">
          {status === "error" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-600">
              <p>Files could not be loaded.</p>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
                onClick={handleRefresh}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : (
            <FileBrowser
              accessToken={accessToken}
              files={loadedForToken === accessToken ? files : []}
              loading={status === "loading" || loadedForToken !== accessToken}
              onFileDeleted={handleFileDeleted}
            />
          )}
        </div>
        {total > limit ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 font-medium disabled:opacity-50"
                disabled={page <= 1 || status === "loading"}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 font-medium disabled:opacity-50"
                disabled={
                  page >= Math.ceil(total / limit) || status === "loading"
                }
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
