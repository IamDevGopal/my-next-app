import type { TaskData } from "../types/task.type";
import type { TaskEditorDraft } from "../types/task-workspace.type";

export function createTaskEditorDraft(task: TaskData | null): TaskEditorDraft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "MEDIUM",
    dueAt: toLocalInputValue(task?.dueAt ?? null),
    reminderAt: toLocalInputValue(task?.reminderAt ?? null),
  };
}
export function toApiDateTimeOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
export function toLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
