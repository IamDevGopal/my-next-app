"use client";

import {
  TextForm,
  LabelForm,
  ItemEditor,
  ConfirmDelete,
} from "./task-resource-forms";
import { TaskActivityFeed } from "./task-activity-feed";
import { inputClass, buttonClass } from "../constants/task-resource.styles";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { searchUsers } from "@/features/users/api/users.api";
import type { PublicUserData } from "@/features/users/types/user.type";
import { getErrorMessage } from "@/lib/http/get-error-message";
import * as api from "../api/task-resources.api";
import type {
  TaskActivityPage,
  TaskChecklist,
  TaskLabel,
  TaskShare,
} from "../types/task-resources.type";
import type { TaskData } from "../types/task.type";

type ResourceTab = "checklists" | "labels" | "shares" | "activity";
export function TaskResourcesPanel({
  accessToken,
  currentUserId,
  task,
  onUpdated,
}: {
  accessToken: string;
  currentUserId: string;
  task: TaskData;
  onUpdated: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<ResourceTab>("checklists");
  const [watching, setWatching] = useState(false);
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [catalog, setCatalog] = useState<TaskLabel[]>([]);
  const [shares, setShares] = useState<TaskShare[]>([]);
  const [activity, setActivity] = useState<TaskActivityPage>({
    activities: [],
    nextCursor: null,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<PublicUserData[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const panelId = useId();
  const canEdit = task.permissions.canUpdate;
  const tabs: ResourceTab[] = canEdit
    ? ["checklists", "labels", "shares", "activity"]
    : ["checklists", "labels", "activity"];
  const disabled = loading || busy !== null || !loaded;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current += 1;
    };
  }, []);

  const reload = useCallback(async (): Promise<boolean> => {
    const request = ++sequence.current;
    const current = () => mounted.current && sequence.current === request;
    setLoading(true);
    setLoaded(false);
    setMessage(null);
    try {
      const watch = await api.getWatchStatus(accessToken, task.id);
      if (!current()) return false;
      setWatching(watch.data.isWatching);
      if (tab === "checklists") {
        const response = await api.listChecklists(accessToken, task.id);
        if (!current()) return false;
        setChecklists(response.data.checklists);
      } else if (tab === "labels") {
        const [assigned, available] = await Promise.all([
          api.listTaskLabels(accessToken, task.id),
          canEdit
            ? api.listLabels(accessToken, task.teamId)
            : Promise.resolve(null),
        ]);
        if (!current()) return false;
        setLabels(assigned.data.labels);
        setCatalog(available?.data.labels ?? []);
        setSelectedLabel("");
      } else if (tab === "shares" && canEdit) {
        const response = await api.listShares(accessToken, task.id);
        if (!current()) return false;
        setShares(response.data.shares);
      } else if (tab === "activity") {
        const response = await api.listActivity(accessToken, task.id);
        if (!current()) return false;
        setActivity(response.data);
      }
      if (!current()) return false;
      setLoaded(true);
      return true;
    } catch (error) {
      if (current()) setMessage(getErrorMessage(error));
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [accessToken, task.id, task.teamId, canEdit, tab]);

  useEffect(() => {
    void reload();
    return () => {
      sequence.current += 1;
    };
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setPeople([]);
    setPeopleError(null);
    if (tab !== "shares" || peopleQuery.trim().length < 3) {
      setPeopleLoading(false);
      return () => controller.abort();
    }
    setPeopleLoading(true);
    const timer = setTimeout(() => {
      void searchUsers({
        accessToken,
        query: peopleQuery.trim(),
        limit: 8,
        signal: controller.signal,
      })
        .then((response) => {
          if (current)
            setPeople(
              response.data.users.filter((user) => user.id !== currentUserId),
            );
        })
        .catch((error) => {
          if (current) setPeopleError(getErrorMessage(error));
        })
        .finally(() => {
          if (current) setPeopleLoading(false);
        });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, currentUserId, peopleQuery, tab]);

  async function perform(
    key: string,
    action: () => Promise<unknown>,
  ): Promise<boolean> {
    if (busy || loading || !loaded) return false;
    setBusy(key);
    setMessage(null);
    try {
      await action();
      if (!mounted.current) return false;
      const refreshed = await reload();
      await onUpdated();
      return refreshed;
    } catch (error) {
      if (mounted.current) {
        /* Reconcile a write whose response may have been lost before offering a retry. */
        await reload();
        if (mounted.current)
          setMessage(
            getErrorMessage(error) +
              " Refresh before retrying if the result is unclear.",
          );
      }
      return false;
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.indexOf(tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    if (busy) return;
    setTab(tabs[next]);
    document.getElementById(panelId + "-" + tabs[next])?.focus();
  }

  async function moreActivity() {
    if (!activity.nextCursor || busy) return;
    setBusy("activity-more");
    const request = sequence.current;
    try {
      const response = await api.listActivity(
        accessToken,
        task.id,
        activity.nextCursor,
      );
      if (!mounted.current || request !== sequence.current) return;
      setActivity((previous) => ({
        ...response.data,
        activities: [
          ...previous.activities,
          ...response.data.activities.filter(
            (row) =>
              !previous.activities.some((existing) => existing.id === row.id),
          ),
        ],
      }));
    } catch (error) {
      if (mounted.current) setMessage(getErrorMessage(error));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  const candidates = [
    task.creator,
    ...task.assignees.flatMap((assignment) =>
      assignment.assigneeUser ? [assignment.assigneeUser] : [],
    ),
  ].filter(
    (user, index, all) =>
      all.findIndex((other) => other.id === user.id) === index,
  );

  return (
    <section className="space-y-4" aria-label="Task collaboration tools">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Organize work and review its history.
        </p>
        <button
          type="button"
          className={buttonClass}
          disabled={disabled}
          aria-pressed={watching}
          onClick={() =>
            void perform("watch", () =>
              api.setWatchStatus(accessToken, task.id, !watching),
            )
          }
        >
          {watching ? "Stop watching" : "Watch task"}
        </button>
      </div>
      <div
        role="tablist"
        aria-label="Task tools"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {tabs.map((value) => (
          <button
            key={value}
            id={panelId + "-" + value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            aria-controls={panelId + "-panel"}
            tabIndex={tab === value ? 0 : -1}
            disabled={busy !== null}
            className={
              buttonClass +
              (tab === value ? " border-emerald-600 text-emerald-800" : "")
            }
            onKeyDown={moveTab}
            onClick={() => setTab(value)}
          >
            {value === "shares"
              ? "Sharing"
              : value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
        <button
          className={buttonClass}
          type="button"
          disabled={busy !== null || loading}
          onClick={() => void reload()}
        >
          Refresh
        </button>
      </div>
      {message ? (
        <p
          role="alert"
          className="rounded-md bg-rose-50 p-3 text-sm text-rose-800"
        >
          {message}
        </p>
      ) : null}
      {busy ? (
        <p role="status" className="text-xs text-slate-500">
          Updating...
        </p>
      ) : null}
      <div
        id={panelId + "-panel"}
        role="tabpanel"
        aria-labelledby={panelId + "-" + tab}
        aria-busy={loading}
      >
        {loading ? (
          <p role="status" className="py-4 text-sm text-slate-500">
            Loading task tools...
          </p>
        ) : null}
        {!loading && loaded && tab === "checklists" ? (
          <div className="space-y-5">
            {canEdit ? (
              <TextForm
                label="New checklist title"
                maxLength={160}
                buttonLabel="Add checklist"
                disabled={disabled}
                onSave={(value) =>
                  perform("create-checklist", () =>
                    api.createChecklist(accessToken, task.id, value),
                  )
                }
              />
            ) : null}
            {!checklists.length ? (
              <p className="text-sm text-slate-500">No checklists yet.</p>
            ) : null}
            {checklists.map((checklist) => (
              <section
                key={checklist.id}
                className="space-y-3 rounded-lg border border-slate-200 p-4"
                aria-label={checklist.title}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">
                    {checklist.title}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      (
                      {
                        checklist.items.filter((item) => item.isCompleted)
                          .length
                      }
                      /{checklist.items.length})
                    </span>
                  </h4>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={buttonClass}
                        disabled={disabled}
                        onClick={() =>
                          setEditingChecklist(
                            editingChecklist === checklist.id
                              ? null
                              : checklist.id,
                          )
                        }
                      >
                        Rename
                      </button>
                      <ConfirmDelete
                        disabled={disabled}
                        label="Delete checklist"
                        onDelete={() =>
                          perform("delete-" + checklist.id, () =>
                            api.deleteChecklist(
                              accessToken,
                              task.id,
                              checklist.id,
                            ),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
                {editingChecklist === checklist.id ? (
                  <TextForm
                    label="Checklist title"
                    initialValue={checklist.title}
                    maxLength={160}
                    buttonLabel="Save title"
                    disabled={disabled}
                    onSave={async (value) => {
                      const saved = await perform("edit-" + checklist.id, () =>
                        api.updateChecklist(
                          accessToken,
                          task.id,
                          checklist.id,
                          value,
                        ),
                      );
                      if (saved) setEditingChecklist(null);
                      return saved;
                    }}
                  />
                ) : null}
                <ul className="space-y-2">
                  {checklist.items.map((item) => (
                    <li key={item.id} className="rounded-md bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="checkbox"
                          aria-label={"Complete " + item.label}
                          checked={item.isCompleted}
                          disabled={!canEdit || disabled}
                          onChange={() =>
                            void perform("toggle-" + item.id, () =>
                              api.toggleChecklistItem(
                                accessToken,
                                task.id,
                                checklist.id,
                                item.id,
                              ),
                            )
                          }
                        />
                        <span
                          className={
                            "min-w-0 flex-1 break-words text-sm " +
                            (item.isCompleted
                              ? "text-slate-500 line-through"
                              : "text-slate-900")
                          }
                        >
                          {item.label}
                        </span>
                        {item.assignee ? (
                          <span className="text-xs text-slate-500">
                            {item.assignee.name}
                          </span>
                        ) : null}
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className={buttonClass}
                              disabled={disabled}
                              onClick={() =>
                                setEditingItem(
                                  editingItem === item.id ? null : item.id,
                                )
                              }
                            >
                              Edit item
                            </button>
                            <ConfirmDelete
                              disabled={disabled}
                              label="Delete item"
                              onDelete={() =>
                                perform("delete-" + item.id, () =>
                                  api.deleteChecklistItem(
                                    accessToken,
                                    task.id,
                                    checklist.id,
                                    item.id,
                                  ),
                                )
                              }
                            />
                          </>
                        ) : null}
                      </div>
                      {editingItem === item.id ? (
                        <ItemEditor
                          key={item.id}
                          item={item}
                          people={candidates}
                          disabled={disabled}
                          onSave={async (body) => {
                            const saved = await perform("edit-" + item.id, () =>
                              api.updateChecklistItem(
                                accessToken,
                                task.id,
                                checklist.id,
                                item.id,
                                body,
                              ),
                            );
                            if (saved) setEditingItem(null);
                            return saved;
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canEdit ? (
                  <TextForm
                    label={"New item for " + checklist.title}
                    maxLength={220}
                    buttonLabel="Add item"
                    disabled={disabled}
                    onSave={(value) =>
                      perform("item-" + checklist.id, () =>
                        api.createChecklistItem(
                          accessToken,
                          task.id,
                          checklist.id,
                          value,
                        ),
                      )
                    }
                  />
                ) : null}
              </section>
            ))}
          </div>
        ) : null}

        {!loading && loaded && tab === "labels" ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {!labels.length ? (
                <p className="text-sm text-slate-500">
                  No labels on this task.
                </p>
              ) : null}
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{
                      backgroundColor: /^#[0-9a-f]{6}$/i.test(label.color ?? "")
                        ? label.color!
                        : "#64748b",
                    }}
                  />
                  {label.name}
                  {canEdit && label.assignmentId ? (
                    <button
                      type="button"
                      aria-label={"Remove " + label.name}
                      disabled={disabled}
                      onClick={() =>
                        void perform("remove-label-" + label.id, () =>
                          api.removeLabel(
                            accessToken,
                            task.id,
                            label.assignmentId!,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
            {canEdit ? (
              <>
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (selectedLabel)
                      void perform("assign-label", () =>
                        api.assignLabel(accessToken, task.id, selectedLabel),
                      );
                  }}
                >
                  <label className="min-w-48 flex-1 text-sm">
                    Available labels
                    <select
                      className={inputClass}
                      value={selectedLabel}
                      disabled={disabled}
                      onChange={(event) => setSelectedLabel(event.target.value)}
                    >
                      <option value="">Choose a label</option>
                      {catalog
                        .filter(
                          (label) =>
                            !labels.some(
                              (attached) => attached.id === label.id,
                            ),
                        )
                        .map((label) => (
                          <option key={label.id} value={label.id}>
                            {label.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className={buttonClass}
                    disabled={disabled || !selectedLabel}
                  >
                    Add label
                  </button>
                </form>
                <LabelForm
                  disabled={disabled}
                  buttonLabel="Create label"
                  onSave={(body) =>
                    perform("create-label", () =>
                      api.createLabel(accessToken, {
                        ...body,
                        ...(task.teamId ? { teamId: task.teamId } : {}),
                      }),
                    )
                  }
                />
                <ul className="space-y-2">
                  {catalog
                    .filter(
                      (label) =>
                        label.teamId === task.teamId &&
                        (label.teamId !== null ||
                          label.createdById === currentUserId),
                    )
                    .map((label) => (
                      <li
                        key={label.id}
                        className="rounded-md border border-slate-200 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm">{label.name}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={buttonClass}
                              disabled={disabled}
                              onClick={() =>
                                setEditingLabel(
                                  editingLabel === label.id ? null : label.id,
                                )
                              }
                            >
                              Edit label
                            </button>
                            <ConfirmDelete
                              disabled={disabled}
                              label="Delete label everywhere"
                              onDelete={() =>
                                perform("delete-label-" + label.id, () =>
                                  api.deleteLabel(accessToken, label.id),
                                )
                              }
                            />
                          </div>
                        </div>
                        {editingLabel === label.id ? (
                          <LabelForm
                            key={label.id}
                            label={label}
                            disabled={disabled}
                            buttonLabel="Save label"
                            onSave={async (body) => {
                              const saved = await perform(
                                "edit-label-" + label.id,
                                () =>
                                  api.updateLabel(accessToken, label.id, body),
                              );
                              if (saved) setEditingLabel(null);
                              return saved;
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        {!loading && loaded && tab === "shares" && canEdit ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Sharing grants read access. Task editing still follows creator and
              team roles.
            </p>
            <label className="block text-sm">
              Find a person
              <input
                className={inputClass}
                value={peopleQuery}
                maxLength={80}
                disabled={disabled}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search at least 3 characters"
              />
            </label>
            {peopleLoading ? (
              <p role="status" className="text-sm">
                Searching people...
              </p>
            ) : null}
            {peopleError ? (
              <p role="alert" className="text-sm text-rose-700">
                {peopleError}
              </p>
            ) : null}
            <ul className="space-y-2">
              {people
                .filter(
                  (person) =>
                    !shares.some((share) => share.userId === person.id),
                )
                .map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-3"
                  >
                    <span className="text-sm">
                      {person.name}
                      {person.username ? " (@" + person.username + ")" : ""}
                    </span>
                    <button
                      className={buttonClass}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        void perform("share-" + person.id, () =>
                          api.shareTask(accessToken, task.id, person.id),
                        )
                      }
                    >
                      Share
                    </button>
                  </li>
                ))}
            </ul>
            <h4 className="font-semibold text-slate-900">Current shares</h4>
            {!shares.length ? (
              <p className="text-sm text-slate-500">No direct shares.</p>
            ) : null}
            <ul className="space-y-2">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 p-3"
                >
                  <span className="text-sm">{share.user.name}</span>
                  <ConfirmDelete
                    label="Revoke access"
                    disabled={disabled}
                    onDelete={() =>
                      perform("revoke-" + share.id, () =>
                        api.revokeShare(accessToken, task.id, share.userId),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && loaded && tab === "activity" ? (
          <TaskActivityFeed
            activity={activity}
            busy={busy !== null}
            onMore={moreActivity}
          />
        ) : null}
      </div>
    </section>
  );
}
