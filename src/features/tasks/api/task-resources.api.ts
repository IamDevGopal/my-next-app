import { requestTaskApi as apiRequest } from "./task-request";
import type {
  TaskActivityPage,
  TaskChecklist,
  TaskChecklistItem,
  TaskLabel,
  TaskShare,
} from "../types/task-resources.type";

function request<T>(
  accessToken: string,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
) {
  return apiRequest<T>(path, { accessToken, method, body });
}

export const getWatchStatus = (token: string, taskId: string) =>
  request<{ isWatching: boolean }>(token, `/tasks/${taskId}/watchers/status`);
export const setWatchStatus = (
  token: string,
  taskId: string,
  enabled: boolean,
) =>
  request(
    token,
    `/tasks/${taskId}/watchers${enabled ? "" : "/unsubscribe"}`,
    "POST",
  );
export const listShares = (token: string, taskId: string) =>
  request<{ shares: TaskShare[] }>(token, `/tasks/${taskId}/shares`);
export const shareTask = (token: string, taskId: string, userId: string) =>
  request(token, `/tasks/${taskId}/shares`, "POST", { userId });
export const revokeShare = (token: string, taskId: string, userId: string) =>
  request(token, `/tasks/${taskId}/shares/unshare`, "POST", { userId });

export const listLabels = (token: string, teamId: string | null) =>
  request<{ labels: TaskLabel[] }>(
    token,
    `/labels${teamId ? "?teamId=" + encodeURIComponent(teamId) : ""}`,
  );
export const listTaskLabels = (token: string, taskId: string) =>
  request<{ labels: TaskLabel[] }>(token, `/tasks/${taskId}/labels`);
export const createLabel = (
  token: string,
  body: { name: string; color: string; teamId?: string },
) => request<{ label: TaskLabel }>(token, "/labels", "POST", body);
export const updateLabel = (
  token: string,
  labelId: string,
  body: { name: string; color: string },
) => request(token, `/labels/${labelId}`, "PATCH", body);
export const deleteLabel = (token: string, labelId: string) =>
  request(token, `/labels/${labelId}`, "DELETE");
export const assignLabel = (token: string, taskId: string, labelId: string) =>
  request(token, `/tasks/${taskId}/labels/assign`, "POST", { labelId });
export const removeLabel = (
  token: string,
  taskId: string,
  assignmentId: string,
) =>
  request(
    token,
    `/tasks/${taskId}/labels/assignments/${assignmentId}`,
    "DELETE",
  );

export const listChecklists = (token: string, taskId: string) =>
  request<{ checklists: TaskChecklist[] }>(
    token,
    `/tasks/${taskId}/checklists`,
  );
export const createChecklist = (token: string, taskId: string, title: string) =>
  request(token, `/tasks/${taskId}/checklists`, "POST", { title });
export const updateChecklist = (
  token: string,
  taskId: string,
  checklistId: string,
  title: string,
) =>
  request(token, `/tasks/${taskId}/checklists/${checklistId}`, "PATCH", {
    title,
  });
export const deleteChecklist = (
  token: string,
  taskId: string,
  checklistId: string,
) => request(token, `/tasks/${taskId}/checklists/${checklistId}`, "DELETE");
export const createChecklistItem = (
  token: string,
  taskId: string,
  checklistId: string,
  label: string,
) =>
  request(token, `/tasks/${taskId}/checklists/${checklistId}/items`, "POST", {
    label,
  });
export const updateChecklistItem = (
  token: string,
  taskId: string,
  checklistId: string,
  itemId: string,
  body: { label: string; assigneeId: string | null },
) =>
  request(
    token,
    `/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`,
    "PATCH",
    body,
  );
export const deleteChecklistItem = (
  token: string,
  taskId: string,
  checklistId: string,
  itemId: string,
) =>
  request(
    token,
    `/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`,
    "DELETE",
  );
export const toggleChecklistItem = (
  token: string,
  taskId: string,
  checklistId: string,
  itemId: string,
) =>
  request<{ item: TaskChecklistItem }>(
    token,
    `/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/toggle`,
    "POST",
  );
export const listActivity = (
  token: string,
  taskId: string,
  cursor?: string | null,
) =>
  request<TaskActivityPage>(
    token,
    `/tasks/${taskId}/activity?limit=20${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
  );
