"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FormMessage } from "@/features/auth/components/form-message";
import {
  createImagePreviewUrl,
  validateAvatarImage,
} from "../utils/image-preview";

interface AvatarUploadControlProps {
  avatarUrl: string | null;
  busy?: boolean;
  disabled?: boolean;
  message?: string | null;
  messageTone?: "neutral" | "success" | "danger";
  name: string;
  onRemove: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
}

export function AvatarUploadControl({
  avatarUrl,
  busy = false,
  disabled = false,
  message,
  messageTone = "neutral",
  name,
  onRemove,
  onUpload,
}: AvatarUploadControlProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const displayUrl = previewUrl ?? avatarUrl;
  const errorId = `${inputId}-error`;
  const messageId = `${inputId}-message`;
  const feedbackIds = [localError ? errorId : null, message ? messageId : null]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateAvatarImage(file);

    if (validationError) {
      setLocalError(validationError);
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = createImagePreviewUrl(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setLocalError(null);
    setPreviewUrl(nextPreviewUrl);

    try {
      await onUpload(file);
    } catch {
      setPreviewUrl(null);
    } finally {
      event.target.value = "";
    }
  }

  async function handleRemove() {
    setLocalError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    await onRemove();
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          aria-label={name}
          className="flex size-16 shrink-0 items-center justify-center rounded-md bg-emerald-700 bg-cover bg-center text-lg font-semibold text-white"
          role="img"
          style={
            displayUrl ? { backgroundImage: `url("${displayUrl}")` } : undefined
          }
        >
          {displayUrl
            ? null
            : getInitials(name) || <ImageIcon className="size-6" />}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose avatar image"
            aria-describedby={feedbackIds || undefined}
            aria-invalid={Boolean(localError)}
            className="sr-only"
            disabled={disabled}
            id={inputId}
            onChange={handleFileChange}
            type="file"
          />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Upload className="size-4" />
            {busy ? "Uploading" : "Upload"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || !avatarUrl}
            onClick={handleRemove}
            type="button"
          >
            <Trash2 className="size-4" />
            Remove
          </button>
        </div>
      </div>

      {localError ? (
        <div id={errorId}>
          <FormMessage tone="danger">{localError}</FormMessage>
        </div>
      ) : null}
      {message ? (
        <div id={messageId}>
          <FormMessage tone={messageTone}>{message}</FormMessage>
        </div>
      ) : null}
    </section>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
