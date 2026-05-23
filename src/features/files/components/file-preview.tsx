"use client";

import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FileRecord } from "../types/files.type";
import { formatFileSize } from "../types/files.type";

interface FilePreviewProps {
  file: FileRecord;
  accessToken: string;
  onClose: () => void;
}

export function FilePreview({
  file,
  accessToken,
  onClose,
}: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch(`/api/files/${file.id}/download`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          setError("Failed to load file");
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch {
        setError("Failed to load file");
      }
    }

    loadPreview();

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, accessToken]);

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const isText = file.mimeType.startsWith("text/");

  return (
    <Dialog
      as="div"
      className="relative z-50"
      onClose={onClose}
      open
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 px-6 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-base font-semibold text-neutral-800">
                {file.originalName}
              </Dialog.Title>
              <p className="text-xs text-neutral-500">
                {formatFileSize(file.sizeBytes)} &middot; {file.mimeType}
              </p>
            </div>
            <a
              className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700"
              download={file.originalName}
              href={previewUrl ?? "#"}
              type="button"
            >
              Download
            </a>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {error ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : previewUrl && isImage ? (
              // next/image needs declared dimensions and configured remote
              // patterns. Previews here use blob URLs created from authenticated
              // downloads, so neither applies. A raw <img> is intentional.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={file.originalName}
                className="mx-auto max-h-[65vh] rounded-lg object-contain"
                src={previewUrl}
              />
            ) : previewUrl && isPdf ? (
              <iframe
                className="h-[65vh] w-full rounded-lg"
                src={previewUrl}
                title={file.originalName}
              />
            ) : previewUrl && isText ? (
              <iframe
                className="h-[65vh] w-full rounded-lg bg-neutral-50"
                src={previewUrl}
                title={file.originalName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                <div className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-neutral-100 text-3xl">
                  📎
                </div>
                <p className="text-sm font-medium">Preview not available</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Download the file to view it
                </p>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
