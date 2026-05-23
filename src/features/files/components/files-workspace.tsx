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

// ── Component ──

export function FilesWorkspace({ accessToken }: FilesWorkspaceProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadRef = useRef(false);

  const loadFiles = useCallback(async () => {
    try {
      const response = await listFiles(accessToken);
      setFiles(response.data.files);
      setStatus("ready");
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    }
  }, [accessToken]);

  useEffect(() => {
    if (loadRef.current) return;
    loadRef.current = true;
    void loadFiles();
  }, [loadFiles]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadFiles();
    setIsRefreshing(false);
  }

  function handleFileDeleted(_fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== _fileId));
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
              Read-only view of files you have attached to tasks, comments, and chat messages.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isRefreshing || status === "loading"}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
          All files ({files.length})
        </div>
        <div className="mt-3">
          <FileBrowser
            accessToken={accessToken}
            files={files}
            loading={status === "loading"}
            onFileDeleted={handleFileDeleted}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </section>
  );
}
