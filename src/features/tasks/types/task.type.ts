import type { PublicUserData } from "@/features/users/types/user.type";
import type {
  CreateTaskFormValues,
  UpdateTaskFormValues,
} from "../schemas/task.schema";

export type TaskScope = "PERSONAL" | "TEAM" | "SHARED";
export type TaskVisibility = "PRIVATE" | "TEAM" | "SHARED" | "PUBLIC";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TeamMemberRole = "OWNER" | "EDITOR" | "VIEWER";
export type TaskAssignmentTarget = "USER" | "TEAM";
export type TaskAssignmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "COMPLETED";

export interface TaskTeamData {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

export interface TaskAssigneeData {
  id: string;
  targetType: TaskAssignmentTarget;
  status: TaskAssignmentStatus;
  assignedAt: string;
  assigneeUser: PublicUserData | null;
}

export interface TaskPermissionsData {
  canRead: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  canAssign: boolean;
  canComment: boolean;
  canAttach: boolean;
}

export interface TaskData {
  id: string;
  creatorId: string;
  teamId: string | null;
  title: string;
  description: string | null;
  scope: TaskScope;
  visibility: TaskVisibility;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  reminderAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: PublicUserData;
  team: TaskTeamData | null;
  currentUserTeamRole: TeamMemberRole | null;
  assignees: TaskAssigneeData[];
  commentsCount: number;
  attachmentsCount: number;
  permissions: TaskPermissionsData;
}

export interface PageInfoData {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface TaskResponseData {
  task: TaskData;
}

export interface TasksResponseData {
  tasks: TaskData[];
  pageInfo: PageInfoData;
}

export type CreateTaskPayload = CreateTaskFormValues;
export type UpdateTaskPayload = UpdateTaskFormValues;

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
}
