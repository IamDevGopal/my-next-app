"use client";

import { Edit3, Loader2, Plus, X } from "lucide-react";

import { useState } from "react";
import { TaskDialogShell } from "./task-dialog-shell";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { createTask, updateTask } from "../api/tasks.api";

import {
  CreateTaskFormSchema,
  UpdateTaskFormSchema,
} from "../schemas/task.schema";

import type {
  TaskData,
  TaskPriority,
  TaskScope,
  UpdateTaskPayload,
} from "../types/task.type";

import type {
  TeamContext,
  TaskEditorDraft,
} from "../types/task-workspace.type";
import { priorityOptions } from "../constants/task-options.constants";
import { TextField, DateTimeField, InlineSelect } from "./task-controls";
import {
  createTaskEditorDraft,
  toApiDateTimeOrNull,
  toLocalInputValue,
} from "../helpers/task-editor.helper";

interface TaskEditorDialogProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
  scope: Exclude<TaskScope, "SHARED">;
  task: TaskData | null;
  team?: TeamContext | null;
}

export function TaskEditorDialog({
  accessToken,
  isOpen,
  onClose,
  onSubmitted,
  scope,
  task,
  team = null,
}: TaskEditorDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <TaskEditorDialogContent
      key={task?.id ?? `${scope}:${team?.id ?? "personal"}`}
      accessToken={accessToken}
      dialogKey={task?.id ?? `${scope}:${team?.id ?? "personal"}`}
      onClose={onClose}
      onSubmitted={onSubmitted}
      scope={scope}
      task={task}
      team={team}
    />
  );
}

function TaskEditorDialogContent({
  accessToken,
  dialogKey,
  onClose,
  onSubmitted,
  scope,
  task,
  team,
}: Omit<TaskEditorDialogProps, "isOpen"> & { dialogKey: string }) {
  const [draft, setDraft] = useState<TaskEditorDraft>(() =>
    createTaskEditorDraft(task),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (task) {
      const result = UpdateTaskFormSchema.safeParse({
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        dueAt: toApiDateTimeOrNull(draft.dueAt),
        ...(draft.reminderAt !== toLocalInputValue(task.reminderAt)
          ? { reminderAt: toApiDateTimeOrNull(draft.reminderAt) }
          : {}),
      });

      if (!result.success) {
        const flattenedErrors = result.error.flatten().fieldErrors;

        setFieldErrors({
          title: flattenedErrors.title?.[0],
          description: flattenedErrors.description?.[0],
          dueAt: flattenedErrors.dueAt?.[0],
        });
        setMessage(
          result.error.issues[0]?.message ?? "Task details are not valid.",
        );
        return;
      }

      setIsSubmitting(true);
      setMessage(null);
      setFieldErrors({});

      try {
        const updatePayload: UpdateTaskPayload = {
          title: result.data.title,
          description: result.data.description,
          priority: result.data.priority,
          dueAt: result.data.dueAt,
          reminderAt: result.data.reminderAt,
        };

        await updateTask(accessToken, task.id, updatePayload);
        await onSubmitted();
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const result = CreateTaskFormSchema.safeParse({
      scope,
      teamId: scope === "TEAM" ? team?.id : undefined,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      dueAt: toApiDateTimeOrNull(draft.dueAt),
      reminderAt: toApiDateTimeOrNull(draft.reminderAt),
    });

    if (!result.success) {
      const flattenedErrors = result.error.flatten().fieldErrors;

      setFieldErrors({
        title: flattenedErrors.title?.[0],
        description: flattenedErrors.description?.[0],
        dueAt: flattenedErrors.dueAt?.[0],
        teamId: flattenedErrors.teamId?.[0],
        scope: flattenedErrors.scope?.[0],
      });
      setMessage(
        result.error.issues[0]?.message ?? "Task details are not valid.",
      );
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setFieldErrors({});

    try {
      await createTask(accessToken, result.data);
      await onSubmitted();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TaskDialogShell
      label={task ? "Edit task" : "Create task"}
      onClose={onClose}
    >
      <form
        key={dialogKey}
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              {task ? "Edit task" : "Create task"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {scope === "TEAM"
                ? `This task will live inside ${team?.name ?? "the selected team"}.`
                : "Personal tasks stay private to your own workspace."}
            </p>
          </div>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-5">
          <TextField
            error={fieldErrors.title}
            label="Task title"
            onChange={(value) =>
              setDraft((current) => ({ ...current, title: value }))
            }
            placeholder="What needs to get done?"
            value={draft.title}
          />

          <label className="block text-sm font-semibold text-slate-800">
            Description
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Add useful context, acceptance notes, or next steps."
              value={draft.description}
            />
            {fieldErrors.description ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                {fieldErrors.description}
              </p>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <InlineSelect
              label="Priority"
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  priority: value as TaskPriority,
                }))
              }
              options={priorityOptions}
              value={draft.priority}
            />
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scope
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {scope === "TEAM"
                  ? (team?.name ?? "Selected team")
                  : "Personal"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField
              label="Due at"
              onChange={(value) =>
                setDraft((current) => ({ ...current, dueAt: value }))
              }
              value={draft.dueAt}
            />
            <DateTimeField
              label="Reminder (local time)"
              onChange={(value) =>
                setDraft((current) => ({ ...current, reminderAt: value }))
              }
              value={draft.reminderAt}
            />
          </div>
          <p className="text-xs text-slate-500">
            Reminder times use this browser&apos;s timezone. Clear the reminder
            field to cancel it. In-app reminders are on by default; email and
            push follow notification settings.
          </p>

          {fieldErrors.teamId || fieldErrors.scope ? (
            <p className="text-xs font-medium text-rose-600">
              {fieldErrors.teamId ?? fieldErrors.scope}
            </p>
          ) : null}

          {message ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {message}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : task ? (
              <Edit3 className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {task ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </TaskDialogShell>
  );
}
