import type { TeamSummaryData } from "@/features/teams/types/team.type";
import type { TaskPriority } from "./task.type";

export interface TeamContext {
  id: string;
  name: string;
  role: TeamSummaryData["currentUserRole"] | null;
}

export type ScopeView = "personal" | "team" | "shared";
export type CollectionStatus = "loading" | "ready" | "error";
export type SelectFilterValue<T extends string> = T | "ALL";

export interface TaskEditorDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string;
  reminderAt: string;
}
