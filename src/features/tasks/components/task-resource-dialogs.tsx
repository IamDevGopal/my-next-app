"use client";

import { X } from "lucide-react";
import { TaskDialogShell } from "./task-dialog-shell";
import { AttachmentsPanel } from "./attachments-panel";
import { CommentsPanel } from "./comments-panel";
import type { TaskData } from "../types/task.type";

interface TaskCommentsDialogProps {
  accessToken: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  task: TaskData | null;
  teamRole: string | null;
}

export function TaskCommentsDialog({
  accessToken,
  currentUserId,
  isOpen,
  onClose,
  onUpdated,
  task,
  teamRole,
}: TaskCommentsDialogProps) {
  if (!isOpen || !task) {
    return null;
  }

  async function handleClose() {
    onClose();
    await onUpdated();
  }

  return (
    <TaskDialogShell label="Task comments" onClose={handleClose}>
      <section className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950">
              Task comments
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500">{task.title}</p>
          </div>
          <button
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            onClick={handleClose}
            title="Close"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <CommentsPanel
            accessToken={accessToken}
            currentUserId={currentUserId}
            permissions={task.permissions}
            taskId={task.id}
            teamRole={teamRole}
            onUpdated={() => void onUpdated()}
          />
        </div>
      </section>
    </TaskDialogShell>
  );
}

interface TaskAttachmentsDialogProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  task: TaskData | null;
}

export function TaskAttachmentsDialog({
  accessToken,
  isOpen,
  onClose,
  onUpdated,
  task,
}: TaskAttachmentsDialogProps) {
  if (!isOpen || !task) {
    return null;
  }

  async function handleClose() {
    onClose();
    await onUpdated();
  }

  return (
    <TaskDialogShell label="Task attachments" onClose={handleClose}>
      <section className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950">
              Task attachments
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500">{task.title}</p>
          </div>
          <button
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            onClick={handleClose}
            title="Close"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <AttachmentsPanel
            accessToken={accessToken}
            permissions={task.permissions}
            taskId={task.id}
            onUpdated={() => void onUpdated()}
          />
        </div>
      </section>
    </TaskDialogShell>
  );
}
