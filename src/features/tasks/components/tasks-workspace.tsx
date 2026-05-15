"use client";

import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listTeams } from "@/features/teams/api/teams.api";
import type { TeamSummaryData } from "@/features/teams/types/team.type";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  archiveTask,
  createTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../api/tasks.api";
import {
  CreateTaskFormSchema,
  UpdateTaskFormSchema,
} from "../schemas/task.schema";
import type {
  PageInfoData,
  TaskData,
  TaskPriority,
  TaskScope,
  TaskStatus,
  UpdateTaskPayload,
} from "../types/task.type";

interface TasksWorkspaceProps {
  accessToken: string;
}

interface TeamTasksPanelProps {
  accessToken: string;
  teamId: string;
  teamName: string;
  currentUserRole: TeamSummaryData["currentUserRole"] | null;
}

interface TeamContext {
  id: string;
  name: string;
  role: TeamSummaryData["currentUserRole"] | null;
}

type ScopeView = "personal" | "team";
type CollectionStatus = "loading" | "ready" | "error";
type SelectFilterValue<T extends string> = T | "ALL";

const statusOptions: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];
const priorityOptions: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TasksWorkspace({ accessToken }: TasksWorkspaceProps) {
  const [teams, setTeams] = useState<TeamSummaryData[]>([]);
  const [teamsMessage, setTeamsMessage] = useState<string | null>(null);
  const [isTeamsLoading, setIsTeamsLoading] = useState(true);
  const [activeView, setActiveView] = useState<ScopeView>("personal");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  useEffect(() => {
    async function loadWorkspaceTeams() {
      setIsTeamsLoading(true);
      setTeamsMessage(null);

      try {
        const response = await listTeams(accessToken, { limit: 50 });
        setTeams(response.data.teams);
        setSelectedTeamId(
          (current) => current || response.data.teams[0]?.id || "",
        );
      } catch (error) {
        setTeamsMessage(getErrorMessage(error));
      } finally {
        setIsTeamsLoading(false);
      }
    }

    void loadWorkspaceTeams();
  }, [accessToken]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Tasks
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Work tracker
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, update, and review personal or team work without leaving
              the dashboard.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleButton
              active={activeView === "personal"}
              icon={<UserRound className="size-4" />}
              label="Personal"
              onClick={() => setActiveView("personal")}
            />
            <ToggleButton
              active={activeView === "team"}
              icon={<ShieldCheck className="size-4" />}
              label="Team"
              onClick={() => setActiveView("team")}
            />
          </div>
        </div>

        {activeView === "team" ? (
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-600">
                Pick a team workspace to manage shared tasks under team
                permissions.
              </p>
            </div>

            <InlineSelect
              disabled={isTeamsLoading || teams.length === 0}
              label="Team workspace"
              onChange={setSelectedTeamId}
              options={
                teams.length === 0
                  ? [isTeamsLoading ? "Loading teams" : "No teams yet"]
                  : teams.map((team) => team.id)
              }
              optionLabels={
                teams.length === 0
                  ? {}
                  : Object.fromEntries(
                      teams.map((team) => [
                        team.id,
                        `${team.name} / ${formatEnum(team.currentUserRole ?? "VIEWER")}`,
                      ]),
                    )
              }
              value={selectedTeamId}
              wrapperClassName="w-full max-w-sm"
            />
          </div>
        ) : null}

        {teamsMessage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {teamsMessage}
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-5">
        {activeView === "personal" ? (
          <TaskCollection
            accessToken={accessToken}
            heading="Personal tasks"
            scope="PERSONAL"
            subheading="Track solo work with the same backend rules and response contracts used by team tasks."
          />
        ) : (
          <TaskCollection
            accessToken={accessToken}
            heading={selectedTeam ? `${selectedTeam.name} tasks` : "Team tasks"}
            scope="TEAM"
            subheading="Shared task progress lives under the selected team's membership rules."
            team={
              selectedTeam
                ? {
                    id: selectedTeam.id,
                    name: selectedTeam.name,
                    role: selectedTeam.currentUserRole,
                  }
                : null
            }
          />
        )}
      </div>
    </section>
  );
}

export function TeamTasksPanel({
  accessToken,
  teamId,
  teamName,
  currentUserRole,
}: TeamTasksPanelProps) {
  return (
    <TaskCollection
      accessToken={accessToken}
      compact
      heading="Team tasks"
      scope="TEAM"
      subheading="This selected team workspace now includes its live task queue."
      team={{ id: teamId, name: teamName, role: currentUserRole }}
    />
  );
}

interface TaskCollectionProps {
  accessToken: string;
  compact?: boolean;
  heading: string;
  scope: Exclude<TaskScope, "SHARED">;
  subheading: string;
  team?: TeamContext | null;
}

function TaskCollection({
  accessToken,
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<SelectFilterValue<TaskStatus>>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<SelectFilterValue<TaskPriority>>("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);

  const canCreateTask =
    scope === "PERSONAL" || (team?.role ? isTeamEditor(team.role) : false);
  const emptyTeamContext = scope === "TEAM" && !team?.id;

  useEffect(() => {
    void refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, scope, team?.id]);

  async function loadTasks(options?: {
    append?: boolean;
    cursor?: string | null;
    withRefreshState?: boolean;
  }) {
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

      setTasks((current) =>
        options?.append
          ? [...current, ...response.data.tasks]
          : response.data.tasks,
      );
      setPageInfo(response.data.pageInfo);
      setStatus("ready");
    } catch (error) {
      setMessage(getErrorMessage(error));
      setStatus(options?.append ? "ready" : "error");
    } finally {
      setIsRefreshing(false);
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
        scope={scope}
        task={editingTask}
        team={team}
      />
    </section>
  );
}

interface TaskCardProps {
  busy: boolean;
  canCreateTeamTask: boolean;
  onArchive: () => void;
  onEdit: () => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TaskStatus) => void;
  task: TaskData;
}

function TaskCard({
  busy,
  canCreateTeamTask,
  onArchive,
  onEdit,
  onPriorityChange,
  onStatusChange,
  task,
}: TaskCardProps) {
  const permissionSummary = task.archivedAt
    ? "Archived"
    : task.permissions.canUpdate
      ? "Can edit"
      : "Read only";

  const canMutate = task.permissions.canUpdate && !task.archivedAt;

  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-semibold text-slate-950">
              {task.title}
            </h4>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            {task.archivedAt ? <ArchivedBadge /> : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{task.scope === "TEAM" ? task.team?.name : "Personal"}</span>
            <span>/</span>
            <span>{permissionSummary}</span>
            {task.currentUserTeamRole ? (
              <>
                <span>/</span>
                <span>{formatEnum(task.currentUserTeamRole)}</span>
              </>
            ) : null}
          </div>

          {task.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canMutate ? (
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
              disabled={busy}
              onClick={onEdit}
              title="Edit task"
              type="button"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Edit3 className="size-4" />
              )}
            </button>
          ) : null}
          {task.permissions.canArchive && !task.archivedAt ? (
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 disabled:opacity-70"
              disabled={busy}
              onClick={onArchive}
              title="Archive task"
              type="button"
            >
              <Archive className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TaskMetaBlock
          icon={<Clock3 className="size-4" />}
          label="Due"
          value={task.dueAt ? formatDateTime(task.dueAt) : "No due date"}
        />
        <TaskMetaBlock
          icon={<UserRound className="size-4" />}
          label="Created by"
          value={task.creator.name}
          avatar={
            <UserAvatar
              avatarUrl={task.creator.avatarUrl}
              name={task.creator.name}
              size="sm"
            />
          }
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InlineSelect
          disabled={!canMutate || busy}
          label="Status"
          onChange={(value) => onStatusChange(value as TaskStatus)}
          options={statusOptions}
          value={task.status}
        />
        <InlineSelect
          disabled={!canMutate || busy}
          label="Priority"
          onChange={(value) => onPriorityChange(value as TaskPriority)}
          options={priorityOptions}
          value={task.priority}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{task.commentsCount} comments</span>
        <span>/</span>
        <span>{task.attachmentsCount} attachments</span>
        <span>/</span>
        <span>
          {task.assignees.length > 0
            ? `${task.assignees.length} assignee${task.assignees.length > 1 ? "s" : ""}`
            : "No assignees yet"}
        </span>
        {task.scope === "TEAM" && !canCreateTeamTask ? (
          <>
            <span>/</span>
            <span>Viewer mode</span>
          </>
        ) : null}
      </div>
    </article>
  );
}

interface TaskEditorDialogProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
  scope: Exclude<TaskScope, "SHARED">;
  task: TaskData | null;
  team?: TeamContext | null;
}

interface TaskEditorDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  reminderAt: string;
}

function TaskEditorDialog({
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
        reminderAt: toApiDateTimeOrNull(draft.reminderAt),
      });

      if (!result.success) {
        const flattenedErrors = result.error.flatten().fieldErrors;

        setFieldErrors({
          title: flattenedErrors.title?.[0],
          description: flattenedErrors.description?.[0],
          dueAt: flattenedErrors.dueAt?.[0],
          reminderAt: flattenedErrors.reminderAt?.[0],
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
        reminderAt: flattenedErrors.reminderAt?.[0],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
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
              label="Reminder at"
              onChange={(value) =>
                setDraft((current) => ({ ...current, reminderAt: value }))
              }
              value={draft.reminderAt}
            />
          </div>

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
    </div>
  );
}

function TaskListSkeleton({ compact }: { compact: boolean }) {
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

interface TextFieldProps {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

function TextField({
  error,
  label,
  onChange,
  placeholder,
  value,
}: TextFieldProps) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </label>
  );
}

function DateTimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function ToggleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function InlineSelect({
  disabled,
  label,
  onChange,
  optionLabels,
  options,
  value,
  wrapperClassName,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  optionLabels?: Record<string, string>;
  options: string[];
  value: string;
  wrapperClassName?: string;
}) {
  return (
    <label
      className={`block min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500 ${wrapperClassName ?? ""}`}
    >
      {label}
      <div className="relative mt-1">
        <select
          className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels?.[option] ??
                (option === "ALL" ? "All" : formatEnum(option))}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  );
}

function TaskMetaBlock({
  avatar,
  icon,
  label,
  value,
}: {
  avatar?: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-500">
        {avatar ?? icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    TODO: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-sky-50 text-sky-700",
    DONE: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-amber-50 text-amber-700",
    HIGH: "bg-orange-50 text-orange-700",
    URGENT: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${styles[priority]}`}
    >
      {formatEnum(priority)}
    </span>
  );
}

function ArchivedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
      <Archive className="size-3" />
      Archived
    </span>
  );
}

interface EmptyStateProps {
  actionLabel?: string;
  icon: React.ReactNode;
  onAction?: () => void;
  text: string;
  title: string;
}

function EmptyState({
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

function isTeamEditor(role: TeamSummaryData["currentUserRole"]) {
  return role === "OWNER" || role === "EDITOR";
}

function createTaskEditorDraft(task: TaskData | null): TaskEditorDraft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "MEDIUM",
    dueAt: toLocalInputValue(task?.dueAt ?? null),
    reminderAt: toLocalInputValue(task?.reminderAt ?? null),
  };
}

function toApiDateTimeOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  return new Date(value).toISOString();
}

function toLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
