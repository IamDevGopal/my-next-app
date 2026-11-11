"use client";

import { Loader2, Plus, UsersRound, X } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { TaskDialogShell } from "./task-dialog-shell";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  createTaskAssignment,
  deleteTaskAssignment,
  getTaskAssignments,
} from "../api/tasks.api";

import type { TaskData, TaskAssignmentsResponseData } from "../types/task.type";

import type { CollectionStatus } from "../types/task-workspace.type";
import { EmptyState } from "./task-collection-states";
import { InlineSelect } from "./task-controls";
import { TaskAssigneeChip } from "./task-metadata";
import { formatDateTime } from "../helpers/task-display.helper";
import {
  getAvailableEligibleUsers,
  getFirstAvailableEligibleUserId,
} from "../helpers/task-assignment.helper";

interface TaskAssignmentsDialogProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  task: TaskData | null;
}

export function TaskAssignmentsDialog({
  accessToken,
  isOpen,
  onClose,
  onUpdated,
  task,
}: TaskAssignmentsDialogProps) {
  if (!isOpen || !task) {
    return null;
  }

  return (
    <TaskAssignmentsDialogContent
      accessToken={accessToken}
      key={task.id}
      onClose={onClose}
      onUpdated={onUpdated}
      task={task}
    />
  );
}

function TaskAssignmentsDialogContent({
  accessToken,
  onClose,
  onUpdated,
  task,
}: Omit<TaskAssignmentsDialogProps, "isOpen" | "task"> & { task: TaskData }) {
  const [status, setStatus] = useState<CollectionStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [eligibleSearch, setEligibleSearch] = useState("");
  const [isLoadingMoreEligible, setIsLoadingMoreEligible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [assignmentsData, setAssignmentsData] =
    useState<TaskAssignmentsResponseData | null>(null);
  const eligibleRequestSequence = useRef(0);
  const eligibleLoadMoreInFlight = useRef(false);

  const canAssign = task.permissions.canAssign;
  const isPersonalTask = task.scope === "PERSONAL";

  useEffect(() => {
    let isCurrent = true;
    eligibleRequestSequence.current += 1;
    eligibleLoadMoreInFlight.current = false;
    setIsLoadingMoreEligible(false);

    async function loadAssignments() {
      setStatus("loading");
      setMessage(null);

      try {
        const response = await getTaskAssignments(accessToken, task.id, {
          q: eligibleSearch.trim() || undefined,
          limit: 20,
        });
        if (!isCurrent) return;
        setAssignmentsData(response.data);
        setSelectedUserId(getFirstAvailableEligibleUserId(response.data));
        setStatus("ready");
      } catch (error) {
        if (!isCurrent) return;
        setMessage(getErrorMessage(error));
        setStatus("error");
      }
    }

    void loadAssignments();

    return () => {
      isCurrent = false;
      eligibleRequestSequence.current += 1;
    };
  }, [accessToken, eligibleSearch, task.id]);

  async function loadMoreEligibleUsers() {
    const cursor = assignmentsData?.eligibleUsersPageInfo.nextCursor;
    if (!cursor || isLoadingMoreEligible || eligibleLoadMoreInFlight.current) {
      return;
    }

    eligibleLoadMoreInFlight.current = true;
    const requestId = eligibleRequestSequence.current;
    setIsLoadingMoreEligible(true);
    try {
      const response = await getTaskAssignments(accessToken, task.id, {
        q: eligibleSearch.trim() || undefined,
        limit: 20,
        cursor,
      });
      if (requestId !== eligibleRequestSequence.current) return;
      setAssignmentsData((current) => {
        if (!current) return response.data;
        const existingIds = new Set(
          current.eligibleUsers.map((user) => user.id),
        );
        return {
          ...response.data,
          eligibleUsers: [
            ...current.eligibleUsers,
            ...response.data.eligibleUsers.filter(
              (user) => !existingIds.has(user.id),
            ),
          ],
        };
      });
    } catch (error) {
      if (requestId === eligibleRequestSequence.current) {
        setMessage(getErrorMessage(error));
      }
    } finally {
      if (requestId === eligibleRequestSequence.current) {
        eligibleLoadMoreInFlight.current = false;
        setIsLoadingMoreEligible(false);
      }
    }
  }

  async function syncAssignments(
    request: Promise<{ data: TaskAssignmentsResponseData }>,
  ) {
    await request;
    const response = await getTaskAssignments(accessToken, task.id, {
      q: eligibleSearch.trim() || undefined,
      limit: 20,
    });
    setAssignmentsData(response.data);
    setSelectedUserId(getFirstAvailableEligibleUserId(response.data));
    await onUpdated();
  }

  async function handleAddAssignment() {
    if (!selectedUserId) {
      setMessage("Choose a team member before assigning responsibility.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await syncAssignments(
        createTaskAssignment(accessToken, task.id, {
          assigneeUserId: selectedUserId,
        }),
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setBusyAssignmentId(assignmentId);
    setMessage(null);

    try {
      await syncAssignments(
        deleteTaskAssignment(accessToken, task.id, assignmentId),
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAssignmentId(null);
    }
  }

  const assignments = assignmentsData?.assignments ?? [];
  const availableUsers = getAvailableEligibleUsers(assignmentsData);

  return (
    <TaskDialogShell label="Manage task assignments" onClose={onClose}>
      <section className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Task assignments
            </h3>
            <p className="mt-1 text-sm text-slate-500">{task.title}</p>
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
          {message ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {message}
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="space-y-3">
              <div className="h-11 animate-pulse rounded-md bg-slate-100" />
              <div className="h-28 animate-pulse rounded-md bg-slate-100" />
            </div>
          ) : status === "error" ? (
            <EmptyState
              icon={<UsersRound className="size-5" />}
              text="Refresh the task workspace and reopen this panel after checking API availability."
              title="Assignments could not load"
            />
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  {canAssign ? (
                    <input
                      aria-label="Search active team members"
                      className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      onChange={(event) =>
                        setEligibleSearch(event.target.value)
                      }
                      placeholder="Search team members"
                      type="search"
                      value={eligibleSearch}
                    />
                  ) : null}
                  <InlineSelect
                    disabled={!canAssign || availableUsers.length === 0}
                    label="Eligible team members"
                    onChange={setSelectedUserId}
                    options={
                      availableUsers.length > 0
                        ? availableUsers.map((user) => user.id)
                        : [""]
                    }
                    optionLabels={
                      availableUsers.length > 0
                        ? Object.fromEntries(
                            availableUsers.map((user) => [
                              user.id,
                              user.username
                                ? `${user.name} (@${user.username})`
                                : user.name,
                            ]),
                          )
                        : { "": "No available assignees" }
                    }
                    value={availableUsers.length > 0 ? selectedUserId : ""}
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={!canAssign || !selectedUserId || isSubmitting}
                    onClick={() => void handleAddAssignment()}
                    type="button"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Add assignee
                  </button>
                </div>

                {canAssign &&
                assignmentsData?.eligibleUsersPageInfo.hasNextPage ? (
                  <button
                    className="mt-3 text-sm font-semibold text-emerald-800 underline underline-offset-2 disabled:opacity-60"
                    disabled={isLoadingMoreEligible}
                    onClick={() => void loadMoreEligibleUsers()}
                    type="button"
                  >
                    {isLoadingMoreEligible
                      ? "Loading members…"
                      : "Load more members"}
                  </button>
                ) : null}

                <p className="mt-3 text-sm text-slate-500">
                  {isPersonalTask
                    ? "Personal tasks stay with their creator. Assignments are available for team tasks."
                    : canAssign
                      ? "Owners and editors can assign active team members here."
                      : "You can review assignees here, but assignment controls stay read-only for this role."}
                </p>
              </div>

              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      key={assignment.id}
                    >
                      <div className="min-w-0">
                        <TaskAssigneeChip assignment={assignment} />
                        <p className="mt-2 text-xs text-slate-500">
                          Assigned by {assignment.assignedBy.name} on{" "}
                          {formatDateTime(assignment.assignedAt)}
                        </p>
                      </div>
                      {canAssign ? (
                        <button
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-70"
                          disabled={busyAssignmentId === assignment.id}
                          onClick={() =>
                            void handleRemoveAssignment(assignment.id)
                          }
                          type="button"
                        >
                          {busyAssignmentId === assignment.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Remove"
                          )}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<UsersRound className="size-5" />}
                  text={
                    isPersonalTask
                      ? "The creator is responsible for this personal task."
                      : "Add the first assignee so responsibility is visible to the team."
                  }
                  title="No assignees yet"
                />
              )}
            </>
          )}
        </div>
      </section>
    </TaskDialogShell>
  );
}
