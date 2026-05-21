"use client";

import { Loader2, Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { formatFileSize } from "@/lib/format-file-size";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { uploadTaskAttachment } from "../api/attachments.api";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const BLOCKED_EXTENSIONS = [
  ".exe", ".sh", ".bat", ".cmd",
  ".js", ".mjs", ".html", ".svg",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface AttachmentUploadProps {
  accessToken: string;
  taskId: string;
  onUploaded: () => void;
  disabled?: boolean;
}

export function AttachmentUpload({
  accessToken,
  taskId,
  onUploaded,
  disabled = false,
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function validateFile(file: File): string | null {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (BLOCKED_EXTENSIONS.includes(extension)) {
      return `Files with "${extension}" extension are not allowed for security reasons.`;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type || "unknown"}" is not supported. Allowed: PDF, TXT, CSV, PNG, JPEG, WebP.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds the 10 MB limit.`;
    }

    if (file.size === 0) {
      return "File is empty.";
    }

    return null;
  }

  function handleFileSelect(file: File | null) {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await uploadTaskAttachment(accessToken, taskId, selectedFile);
      setSelectedFile(null);
      onUploaded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    handleFileSelect(file ?? null);
  }

  const formattedSize = selectedFile
    ? formatFileSize(selectedFile.size)
    : null;

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition ${
          isDragOver
            ? "border-emerald-400 bg-emerald-50"
            : disabled
              ? "border-slate-200 bg-slate-50"
              : "border-slate-300 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }
        }}
      >
        <input
          ref={fileInputRef}
          accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) =>
            handleFileSelect(event.target.files?.[0] ?? null)
          }
          type="file"
        />

        {selectedFile ? (
          <div className="flex w-full items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Paperclip className="size-5 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">{formattedSize}</p>
            </div>
            <button
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedFile(null);
                setError(null);
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload
              className={`size-8 ${isDragOver ? "text-emerald-500" : "text-slate-400"}`}
            />
            <p className="mt-2 text-sm font-medium text-slate-700">
              {isDragOver
                ? "Drop file here"
                : "Click to browse or drag & drop"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              PDF, TXT, CSV, PNG, JPEG, WebP &middot; max 10 MB
            </p>
          </>
        )}
      </div>

      {selectedFile ? (
        <div className="flex justify-end">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isUploading}
            onClick={handleUpload}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
