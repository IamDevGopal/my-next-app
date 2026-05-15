import { apiRequest } from "@/lib/http/api-client";
import type {
  CreateTaskPayload,
  TaskPriority,
  TaskResponseData,
  TaskScope,
  TaskStatus,
  TasksResponseData,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from "../types/task.type";

interface CursorQuery {
  limit?: number;
  cursor?: string | null;
}

export interface ListTasksQuery extends CursorQuery {
  q?: string;
  scope?: TaskScope;
  teamId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  includeArchived?: boolean;
}

function toSearchParams(
  query: Record<string, string | number | boolean | null | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function listTasks(accessToken: string, query: ListTasksQuery = {}) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TasksResponseData>(`/tasks?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function getTask(accessToken: string, taskId: string) {
  return apiRequest<TaskResponseData>(`/tasks/${taskId}`, {
    method: "GET",
    accessToken,
  });
}

export function createTask(accessToken: string, payload: CreateTaskPayload) {
  return apiRequest<TaskResponseData>("/tasks", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateTask(
  accessToken: string,
  taskId: string,
  payload: UpdateTaskPayload,
) {
  return apiRequest<TaskResponseData>(`/tasks/${taskId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function updateTaskStatus(
  accessToken: string,
  taskId: string,
  payload: UpdateTaskStatusPayload,
) {
  return apiRequest<TaskResponseData>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function archiveTask(accessToken: string, taskId: string) {
  return apiRequest<TaskResponseData>(`/tasks/${taskId}`, {
    method: "DELETE",
    accessToken,
  });
}
