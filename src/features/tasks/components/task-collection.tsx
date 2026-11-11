"use client";

import {
  Clock3,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { TaskDialogShell } from "./task-dialog-shell";
import { TaskResourcesPanel } from "./task-resources-panel";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  archiveTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../api/tasks.api";

import type {
  PageInfoData,
  TaskData,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "../types/task.type";

import type {
  TeamContext,
  CollectionStatus,
  SelectFilterValue,
} from "../types/task-workspace.type";
import {
  statusOptions,
  priorityOptions,
} from "../constants/task-options.constants";
import { TaskCard } from "./task-card";
import { TaskEditorDialog } from "./task-editor-dialog";
import { TaskAssignmentsDialog } from "./task-assignments-dialog";
import {
  TaskCommentsDialog,
  TaskAttachmentsDialog,
} from "./task-resource-dialogs";
import { TaskListSkeleton, EmptyState } from "./task-collection-states";
import { InlineSelect } from "./task-controls";
import { isTeamEditor, formatEnum } from "../helpers/task-display.helper";

interface TaskCollectionProps {
  accessToken: string;
  currentUserId: string;
  compact?: boolean;
  heading: string;
  scope: TaskScope;
  subheading: string;
  team?: TeamContext | null;
}

export function TaskCollection({
  accessToken,
  currentUserId,
  compact = false,
  heading,
  scope,
  subheading,
  team = null,
}: TaskCollectionProps) {
  const [status, setStatus] = useState<CollectionStatus>("loading");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfoData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [assignmentTask, setAssignmentTask] = useState<TaskData | null>(null);
  const [commentTask, setCommentTask] = useState<TaskData | null>(null);
  const [attachmentTask, setAttachmentTask] = useState<TaskData | null>(null);
  const [resourcesTask, setResourcesTask] = useState<TaskData | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<SelectFilterValue<TaskStatus>>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<SelectFilterValue<TaskPriority>>("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);
  const taskRequestId = useRef(0);

  const canCreateTask =
    scope === "PERSONAL" || (team?.role ? isTeamEditor(team.role) : false);
  const emptyTeamContext = scope === "TEAM" && !team?.id;

  useEffect(() => {
    void refreshTasks();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [accessToken, currentUserId, scope, team?.id]);

  async function loadTasks(options?: {
    append?: boolean;
    cursor?: string | null;
    withRefreshState?: boolean;
  }) {
    const requestId = ++taskRequestId.current;

    if (emptyTeamContext) {
      setTasks([]);
      setPageInfo(null);
      setStatus("ready");
      return;
    }

    if (options?.withRefreshState) {
      setIsRefreshing(true);
    } else if (!options?.append) {
      setStatus("loading");
    }

    setMessage(null);

    try {
      const response = await listTasks(accessToken, {
        limit: compact ? 10 : 20,
        cursor: options?.cursor,
        q: query.trim() || undefined,
        scope,
        teamId: scope === "TEAM" ? team?.id : undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        priority: priorityFilter === "ALL" ? undefined : priorityFilter,
        includeArchived,
      });

      if (requestId !== taskRequestId.current) return;

      setTasks((current) =>
        options?.append
          ? [
              ...current,
              ...response.data.tasks.filter(
                (task) => !current.some((existing) => existing.id === task.id),
              ),
            ]
          : response.data.tasks,
      );
      setPageInfo(response.data.pageInfo);
      setStatus("ready");
    } catch (error) {
      if (requestId !== taskRequestId.current) return;
      setMessage(getErrorMessage(error));
      setStatus(options?.append ? "ready" : "error");
    } finally {
      if (requestId === taskRequestId.current) setIsRefreshing(false);
    }
  }

  async function refreshTasks() {
    await loadTasks({ withRefreshState: status === "ready" });
  }

  async function handleStatusChange(task: TaskData, nextStatus: TaskStatus) {
    if (task.status === nextStatus) {
      return;
    }

    setBusyTaskId(task.id);
    setMessage(null);

    try {
      await updateTaskStatus(accessToken, task.id, { status: nextStatus });
      await refreshTasks();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handlePriorityChange(
    task: TaskData,
    nextPriority: TaskPriority,
  ) {
    if (task.priority === nextPriority) {
      return;
    }

    setBusyTaskId(task.id);
    setMessage(null);

    try {
      await updateTask(accessToken, task.id, { priority: nextPriority });
      await refreshTasks();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleArchive(task: TaskData) {
    setBusyTaskId(task.id);
    setMessage(null);

    try {
      await archiveTask(accessToken, task.id);
      await refreshTasks();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTaskSubmitted() {
    setEditingTask(null);
    setIsDialogOpen(false);
    await refreshTasks();
  }

  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 ${
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950">{heading}</h3>
            {scope === "TEAM" && team ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {formatEnum(team.role ?? "VIEWER")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{subheading}</p>
        </div>

        <div className="flex flex-col gap-2 min-[360px]:flex-row">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-70"
            disabled={isRefreshing || status === "loading"}
            onClick={() => void refreshTasks()}
            type="button"
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Refresh
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!canCreateTask || emptyTeamContext}
            onClick={() => {
              setEditingTask(null);
              setIsDialogOpen(true);
            }}
            type="button"
          >
            <Plus className="size-4" />
            New task
          </button>
        </div>
      </div>

      {scope === "TEAM" && team?.role === "VIEWER" ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You can review team tasks here, but changes stay disabled because this
          membership is read-only.
        </div>
      ) : null}

      <form
        className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.8fr)]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadTasks();
        }}
      >
        <label className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Search
          <div className="mt-1 flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
            <Filter className="size-4 text-slate-400" />
            <input
              className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title or description"
              value={query}
            />
          </div>
        </label>

        <InlineSelect
          label="Status"
          onChange={(value) =>
            setStatusFilter(value as SelectFilterValue<TaskStatus>)
          }
          options={["ALL", ...statusOptions]}
          value={statusFilter}
        />
        <InlineSelect
          label="Priority"
          onChange={(value) =>
            setPriorityFilter(value as SelectFilterValue<TaskPriority>)
          }
          options={["ALL", ...priorityOptions]}
          value={priorityFilter}
        />

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Actions
          </p>
          <label className="inline-flex h-11 min-w-0 items-center gap-2 rounded-md border border-transparent px-1 text-sm font-medium text-slate-700">
            <input
              checked={includeArchived}
              className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              onChange={(event) => setIncludeArchived(event.target.checked)}
              type="checkbox"
            />
            Include archived
          </label>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="submit"
          >
            <RefreshCcw className="size-4" />
            Apply filters
          </button>
        </div>
      </form>

      {message ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {message}
        </div>
      ) : null}

      {status === "loading" ? (
        <TaskListSkeleton compact={compact} />
      ) : status === "error" ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          text="Refresh this task workspace after checking your session or API availability."
          title="Tasks could not load"
        />
      ) : emptyTeamContext ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          text="Choose a team before loading shared task work."
          title="Select a team"
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          actionLabel={canCreateTask ? "Create task" : undefined}
          icon={<FileText className="size-5" />}
          onAction={
            canCreateTask
              ? () => {
                  setEditingTask(null);
                  setIsDialogOpen(true);
                }
              : undefined
          }
          text={
            includeArchived ||
            query ||
            statusFilter !== "ALL" ||
            priorityFilter !== "ALL"
              ? "Try clearing the current filters or create a new task."
              : "Start with a task so this workspace has something concrete to track."
          }
          title="No tasks found"
        />
      ) : (
        <>
          <div
            className={`mt-4 grid min-w-0 gap-3 ${
              compact ? "xl:grid-cols-1" : "xl:grid-cols-2"
            }`}
          >
            {tasks.map((task) => (
              <TaskCard
                busy={busyTaskId === task.id}
                canCreateTeamTask={canCreateTask}
                key={task.id}
                onArchive={() => void handleArchive(task)}
                onEdit={() => {
                  setEditingTask(task);
                  setIsDialogOpen(true);
                }}
                onManageAssignments={() => setAssignmentTask(task)}
                onManageAttachments={() => setAttachmentTask(task)}
                onManageComments={() => setCommentTask(task)}
                onManageResources={() => setResourcesTask(task)}
                onPriorityChange={(value) =>
                  void handlePriorityChange(task, value)
                }
                onStatusChange={(value) => void handleStatusChange(task, value)}
                task={task}
              />
            ))}
          </div>

          {pageInfo?.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() =>
                  void loadTasks({
                    append: true,
                    cursor: pageInfo.nextCursor,
                    withRefreshState: true,
                  })
                }
                type="button"
              >
                {isRefreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Clock3 className="size-4" />
                )}
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}

      <TaskEditorDialog
        accessToken={accessToken}
        isOpen={isDialogOpen}
        onClose={() => {
          setEditingTask(null);
          setIsDialogOpen(false);
        }}
        onSubmitted={handleTaskSubmitted}
        scope={
          editingTask?.scope === "TEAM"
            ? "TEAM"
            : scope === "TEAM"
              ? "TEAM"
              : "PERSONAL"
        }
        task={editingTask}
        team={team}
      />
      <TaskAssignmentsDialog
        accessToken={accessToken}
        isOpen={assignmentTask !== null}
        onClose={() => setAssignmentTask(null)}
        onUpdated={refreshTasks}
        task={assignmentTask}
      />
      <TaskCommentsDialog
        accessToken={accessToken}
        currentUserId={currentUserId}
        isOpen={commentTask !== null}
        onClose={() => setCommentTask(null)}
        onUpdated={refreshTasks}
        task={commentTask}
        teamRole={team?.role ?? null}
      />
      <TaskAttachmentsDialog
        accessToken={accessToken}
        isOpen={attachmentTask !== null}
        onClose={() => setAttachmentTask(null)}
        onUpdated={refreshTasks}
        task={attachmentTask}
      />
      {resourcesTask ? (
        <TaskDialogShell
          label="Task tools"
          onClose={() => setResourcesTask(null)}
        >
          <section className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{resourcesTask.title}</h3>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setResourcesTask(null)}
              >
                Close
              </button>
            </div>
            <TaskResourcesPanel
              key={currentUserId + ":" + resourcesTask.id}
              accessToken={accessToken}
              currentUserId={currentUserId}
              task={resourcesTask}
              onUpdated={refreshTasks}
            />
          </section>
        </TaskDialogShell>
      ) : null}
    </section>
  );
}
