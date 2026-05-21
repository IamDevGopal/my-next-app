"use client";

import { Loader2, MessageSquarePlus, SendHorizonal } from "lucide-react";
import { useState } from "react";

interface CommentFormProps {
  initialValue?: string;
  isEditing?: boolean;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
}

export function CommentForm({
  initialValue = "",
  isEditing = false,
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
}: CommentFormProps) {
  const [body, setBody] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      if (!isEditing) {
        setBody("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save comment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <div className="relative">
        <textarea
          className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={isSubmitting}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          value={body}
        />
        <div className="absolute bottom-3 right-3 text-slate-400">
          {isEditing ? (
            <MessageSquarePlus className="size-4" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <button
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
        <button
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting || !body.trim()}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <SendHorizonal className="size-3.5" />
          )}
          {isEditing ? "Save" : "Comment"}
        </button>
      </div>
    </form>
  );
}
