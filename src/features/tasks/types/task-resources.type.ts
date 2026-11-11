import type { PublicUserData } from "@/features/users/types/user.type";

export interface TaskLabel {
  id: string;
  assignmentId?: string;
  teamId: string | null;
  createdById: string | null;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklistItem {
  id: string;
  checklistId: string;
  label: string;
  assigneeId: string | null;
  assignee: PublicUserData | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface TaskChecklist {
  id: string;
  taskId: string;
  title: string;
  items: TaskChecklistItem[];
}

export interface TaskShare {
  id: string;
  userId: string;
  sharedAt: string;
  user: PublicUserData;
}

export interface TaskActivity {
  id: string;
  action: string;
  actor: PublicUserData | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskActivityPage {
  activities: TaskActivity[];
  nextCursor: string | null;
  hasMore: boolean;
}
