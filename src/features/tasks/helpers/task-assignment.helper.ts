import type { TaskAssignmentsResponseData } from "../types/task.type";

export function getAvailableEligibleUsers(
  data: TaskAssignmentsResponseData | null,
) {
  if (!data) {
    return [];
  }

  return data.eligibleUsers.filter(
    (user) =>
      !data.assignments.some(
        (assignment) => assignment.assigneeUser?.id === user.id,
      ),
  );
}
export function getFirstAvailableEligibleUserId(
  data: TaskAssignmentsResponseData,
) {
  return getAvailableEligibleUsers(data)[0]?.id ?? "";
}
