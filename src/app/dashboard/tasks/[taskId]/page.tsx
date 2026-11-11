"use client";

import { useParams } from "next/navigation";
import { TaskDetailScreen } from "@/features/tasks/components/task-detail-screen";

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();

  if (!params) {
    return null;
  }

  const { taskId } = params;
  return <TaskDetailScreen key={taskId} taskId={taskId} />;
}
