"use client";

import { Archive, UsersRound } from "lucide-react";

import { UserAvatar } from "@/features/users/components/user-avatar";
import type { TaskData, TaskPriority, TaskStatus } from "../types/task.type";

import { formatEnum } from "../helpers/task-display.helper";

export function TaskMetaBlock({
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

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
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

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
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

export function ArchivedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
      <Archive className="size-3" />
      Archived
    </span>
  );
}

export function TaskAssigneeChip({
  assignment,
}: {
  assignment: TaskData["assignees"][number];
}) {
  const user = assignment.assigneeUser;

  return (
    <div className="inline-flex min-w-0 items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
      {user ? (
        <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size="sm" />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-full bg-white text-slate-500">
          <UsersRound className="size-3.5" />
        </div>
      )}
      <span className="truncate">
        {user
          ? user.username
            ? `${user.name} (@${user.username})`
            : user.name
          : "Assigned target"}
      </span>
    </div>
  );
}
