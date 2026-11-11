import type { TeamSummaryData } from "@/features/teams/types/team.type";

export function isTeamEditor(role: TeamSummaryData["currentUserRole"]) {
  return role === "OWNER" || role === "EDITOR";
}
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
