"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAccessToken,
  getAuthSessionVersion,
  subscribeToAuthTokenChanges,
} from "@/features/auth/utils/auth-storage";
import { getCurrentUser } from "@/features/users/api/users.api";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  archiveTask,
  getTask,
  updateTask,
  updateTaskStatus,
} from "../api/tasks.api";
import type { TaskData, TaskPriority, TaskStatus } from "../types/task.type";
import { AttachmentsPanel } from "./attachments-panel";
import { CommentsPanel } from "./comments-panel";
import { TaskResourcesPanel } from "./task-resources-panel";
import { TaskAssignmentsDialog } from "./task-assignments-dialog";
import { TaskEditorDialog } from "./task-editor-dialog";

export function TaskDetailScreen({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<{
    accessToken: string;
    userId: string;
  } | null>(null);
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const requestSequence = useRef(0);

  useEffect(
    () =>
      subscribeToAuthTokenChanges(() => {
        setSession(null);
        setBusy(false);
        setConfirmArchive(false);
        setTask(null);
        setAttempt((value) => value + 1);
      }),
    [],
  );

  useEffect(() => {
    const request = ++requestSequence.current;
    let current = true;
    const token = getAccessToken();
    const version = getAuthSessionVersion();
    setLoading(true);
    setMessage(null);
    setTask(null);
    setSession(null);
    setEditOpen(false);
    setAssignmentsOpen(false);
    if (!token) {
      router.replace("/login");
      return;
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        taskId,
      )
    ) {
      setMessage("Task link is invalid.");
      setLoading(false);
      return;
    }
    void Promise.all([getCurrentUser(token), getTask(token, taskId)])
      .then(([userResponse, taskResponse]) => {
        if (
          !current ||
          request !== requestSequence.current ||
          version !== getAuthSessionVersion()
        )
          return;
        setSession({
          accessToken: getAccessToken() ?? token,
          userId: userResponse.data.user.id,
        });
        setTask(taskResponse.data.task);
      })
      .catch((error) => {
        if (current && request === requestSequence.current)
          setMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (current && request === requestSequence.current) setLoading(false);
      });
    return () => {
      current = false;
      requestSequence.current += 1;
    };
  }, [taskId, attempt, router]);

  const reloadTask = useCallback(async () => {
    if (!session) return;
    const request = ++requestSequence.current;
    const version = getAuthSessionVersion();
    try {
      const response = await getTask(
        getAccessToken() ?? session.accessToken,
        taskId,
      );
      if (
        request !== requestSequence.current ||
        version !== getAuthSessionVersion()
      )
        return;
      setTask(response.data.task);
    } catch (error) {
      if (
        request !== requestSequence.current ||
        version !== getAuthSessionVersion()
      )
        return;
      setTask(null);
      setMessage(getErrorMessage(error));
    }
  }, [session, taskId]);

  async function change(action: () => Promise<unknown>) {
    if (busy) return;
    const version = getAuthSessionVersion();
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (version === getAuthSessionVersion()) await reloadTask();
    } catch (error) {
      if (version === getAuthSessionVersion()) {
        setMessage(getErrorMessage(error));
        await reloadTask();
      }
    } finally {
      if (version === getAuthSessionVersion()) setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm font-semibold text-emerald-800 underline"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          disabled={loading || busy}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh task
        </button>
      </div>
      {message ? (
        <p
          role="alert"
          className="rounded-md bg-rose-50 p-4 text-sm text-rose-800"
        >
          {message}
        </p>
      ) : null}
      {loading ? <p role="status">Loading task...</p> : null}
      {session && task ? (
        <>
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h1 className="break-words text-2xl font-semibold text-slate-950">
              {task.title}
            </h1>
            <p className="text-sm text-slate-500">
              {task.team?.name ?? "Personal task"} ·{" "}
              {task.archivedAt
                ? "Archived"
                : task.permissions.canUpdate
                  ? "Can edit"
                  : "Read only"}
            </p>
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {task.description}
              </p>
            ) : null}
            <p className="text-sm text-slate-600">
              Due:{" "}
              {task.dueAt
                ? new Date(task.dueAt).toLocaleString()
                : "No due date"}
            </p>
            <p className="text-sm text-slate-600">
              Reminder:{" "}
              {task.reminderAt
                ? new Date(task.reminderAt).toLocaleString()
                : "Off"}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                Status
                <select
                  className="ml-2 rounded-md border border-slate-300 px-3 py-2"
                  value={task.status}
                  disabled={!task.permissions.canUpdate || busy}
                  onChange={(event) =>
                    void change(() =>
                      updateTaskStatus(session.accessToken, task.id, {
                        status: event.target.value as TaskStatus,
                      }),
                    )
                  }
                >
                  {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value.toLowerCase().replaceAll("_", " ")}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="text-sm">
                Priority
                <select
                  className="ml-2 rounded-md border border-slate-300 px-3 py-2"
                  value={task.priority}
                  disabled={!task.permissions.canUpdate || busy}
                  onChange={(event) =>
                    void change(() =>
                      updateTask(session.accessToken, task.id, {
                        priority: event.target.value as TaskPriority,
                      }),
                    )
                  }
                >
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value.toLowerCase()}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={busy}
                onClick={() => setAssignmentsOpen(true)}
              >
                Assignments
              </button>
              {task.permissions.canUpdate ? (
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  disabled={busy}
                  onClick={() => setEditOpen(true)}
                >
                  Edit task
                </button>
              ) : null}
              {task.permissions.canArchive ? (
                <button
                  type="button"
                  className="rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700"
                  disabled={busy}
                  onClick={() =>
                    confirmArchive
                      ? void change(() =>
                          archiveTask(session.accessToken, task.id),
                        )
                      : setConfirmArchive(true)
                  }
                >
                  {confirmArchive ? "Confirm archive" : "Archive task"}
                </button>
              ) : null}
              {confirmArchive && task.permissions.canArchive ? (
                <button
                  type="button"
                  className="text-sm underline"
                  disabled={busy}
                  onClick={() => setConfirmArchive(false)}
                >
                  Cancel archive
                </button>
              ) : null}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <TaskResourcesPanel
              key={session.userId + ":" + task.id}
              accessToken={session.accessToken}
              currentUserId={session.userId}
              task={task}
              onUpdated={reloadTask}
            />
          </section>
          <CommentsPanel
            key={"comments:" + session.userId + ":" + task.id}
            accessToken={session.accessToken}
            currentUserId={session.userId}
            taskId={task.id}
            permissions={task.permissions}
            teamRole={task.currentUserTeamRole}
            onUpdated={() => void reloadTask()}
          />
          <AttachmentsPanel
            key={"files:" + session.userId + ":" + task.id}
            accessToken={session.accessToken}
            taskId={task.id}
            permissions={task.permissions}
            onUpdated={() => void reloadTask()}
          />
          <TaskEditorDialog
            accessToken={session.accessToken}
            isOpen={editOpen}
            task={task}
            scope={task.scope === "TEAM" ? "TEAM" : "PERSONAL"}
            team={
              task.team
                ? {
                    id: task.team.id,
                    name: task.team.name,
                    role: task.currentUserTeamRole,
                  }
                : null
            }
            onClose={() => setEditOpen(false)}
            onSubmitted={async () => {
              setEditOpen(false);
              await reloadTask();
            }}
          />
          <TaskAssignmentsDialog
            accessToken={session.accessToken}
            isOpen={assignmentsOpen}
            task={task}
            onClose={() => setAssignmentsOpen(false)}
            onUpdated={reloadTask}
          />
        </>
      ) : null}
    </main>
  );
}
