"use client";

import { FileIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FileRecord } from "../types/files.type";
import { formatFileSize, getFileColor, getFileIcon } from "../types/files.type";
import { deleteFile } from "../api/files.api";
import { FilePreview } from "./file-preview";

interface FileBrowserProps {
  files: FileRecord[];
  accessToken: string;
  onFileDeleted?: (fileId: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function FileBrowser({
  files,
  accessToken,
  onFileDeleted,
  onRefresh,
  loading = false,
}: FileBrowserProps) {
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    try {
      await deleteFile(accessToken, fileId);
      onFileDeleted?.(fileId);
      onRefresh?.();
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
        <FileIcon className="mb-3 size-12 opacity-30" />
        <p className="text-sm font-medium">No files uploaded yet</p>
        <p className="text-xs">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-emerald-200 hover:shadow-sm"
          >
            {/* Icon */}
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-lg ${getFileColor(file.mimeType)}`}
            >
              {getFileIcon(file.mimeType)}
            </div>

            {/* Info */}
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => setPreviewFile(file)}
              type="button"
            >
              <p className="truncate text-sm font-medium text-neutral-800">
                {file.originalName}
              </p>
              <p className="text-xs text-neutral-500">
                {formatFileSize(file.sizeBytes)}
                {file.source && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {file.source.type.replace("_", " ")}
                  </span>
                )}
              </p>
            </button>

            {/* Actions */}
            <button
              className="shrink-0 rounded-lg p-2 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-30"
              disabled={deletingId === file.id}
              onClick={() => handleDelete(file.id)}
              title="Delete file"
              type="button"
            >
              {deletingId === file.id ? (
                <svg
                  className="size-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {previewFile && (
        <FilePreview
          file={previewFile}
          accessToken={accessToken}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
