"use client";

import {
  Archive,
  Clock3,
  Edit3,
  Loader2,
  ListTodo,
  MessageSquare,
  Paperclip,
  UserRound,
  UsersRound,
} from "lucide-react";

import { UserAvatar } from "@/features/users/components/user-avatar";
import type { TaskData, TaskPriority, TaskStatus } from "../types/task.type";

import Link from "next/link";
import {
  statusOptions,
  priorityOptions,
} from "../constants/task-options.constants";
import { InlineSelect } from "./task-controls";
import {
  TaskMetaBlock,
  TaskStatusBadge,
  TaskPriorityBadge,
  ArchivedBadge,
  TaskAssigneeChip,
} from "./task-metadata";
import { formatDateTime, formatEnum } from "../helpers/task-display.helper";

interface TaskCardProps {
  busy: boolean;
  canCreateTeamTask: boolean;
  onArchive: () => void;
  onEdit: () => void;
  onManageAssignments: () => void;
  onManageAttachments: () => void;
  onManageComments: () => void;
  onManageResources: () => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: TaskStatus) => void;
  task: TaskData;
}

export function TaskCard({
  busy,
  canCreateTeamTask,
  onArchive,
  onEdit,
  onManageAssignments,
  onManageAttachments,
  onManageComments,
  onManageResources,
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
              <Link
                href={"/dashboard/tasks/" + task.id}
                className="hover:underline"
              >
                {task.title}
              </Link>
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

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Checklists, labels, sharing and activity"
            title="Task tools"
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={onManageResources}
          >
            <ListTodo className="size-4" />
          </button>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={onManageComments}
            title="Comments"
            type="button"
          >
            <MessageSquare className="size-4" />
          </button>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={onManageAttachments}
            title="Attachments"
            type="button"
          >
            <Paperclip className="size-4" />
          </button>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={onManageAssignments}
            title="View assignments"
            type="button"
          >
            <UsersRound className="size-4" />
          </button>
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
        <button
          className="cursor-pointer underline-offset-2 hover:underline hover:text-slate-700"
          onClick={onManageComments}
          type="button"
        >
          {task.commentsCount} comment{task.commentsCount !== 1 ? "s" : ""}
        </button>
        <span>/</span>
        <button
          className="cursor-pointer underline-offset-2 hover:underline hover:text-slate-700"
          onClick={onManageAttachments}
          type="button"
        >
          {task.attachmentsCount} attachment
          {task.attachmentsCount !== 1 ? "s" : ""}
        </button>
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

      {task.assignees.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {task.assignees.slice(0, 3).map((assignment) => (
            <TaskAssigneeChip assignment={assignment} key={assignment.id} />
          ))}
          {task.assignees.length > 3 ? (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              +{task.assignees.length - 3} more
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
