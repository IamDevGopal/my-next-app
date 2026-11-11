"use client";

import { Plus } from "lucide-react";

export function TaskListSkeleton({ compact }: { compact: boolean }) {
  return (
    <div
      className={`mt-4 grid gap-3 ${
        compact ? "xl:grid-cols-1" : "xl:grid-cols-2"
      }`}
    >
      {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
        <div
          className="rounded-lg border border-slate-200 bg-white p-4"
          key={index}
        >
          <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="h-16 animate-pulse rounded bg-slate-100" />
            <div className="h-16 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  actionLabel?: string;
  icon: React.ReactNode;
  onAction?: () => void;
  text: string;
  title: string;
}

export function EmptyState({
  actionLabel,
  icon,
  onAction,
  text,
  title,
}: EmptyStateProps) {
  return (
    <div className="mt-4 flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div>
        <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-white text-slate-500">
          {icon}
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
        {actionLabel && onAction ? (
          <button
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={onAction}
            type="button"
          >
            <Plus className="size-4" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
