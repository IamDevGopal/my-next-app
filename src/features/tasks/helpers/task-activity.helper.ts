const labels: Readonly<Record<string, string>> = {
  "task.created": "created the task",
  "task.updated": "updated the task",
  "task.status_updated": "changed the task status",
  "task.archived": "archived the task",
  "task.reminder_queued": "queued reminder notifications",
  "assignment.created": "assigned a teammate",
  "assignment.removed": "removed an assignment",
  "task.shared": "shared the task",
  "task.share_revoked": "revoked a share",
  "watcher.subscribed": "started watching",
  "watcher.unsubscribed": "stopped watching",
  "label.updated": "updated a label",
  "label.assigned": "added a label",
  "label.unassigned": "removed a label",
  "checklist.created": "created a checklist",
  "checklist.updated": "renamed a checklist",
  "checklist.deleted": "deleted a checklist",
  "checklist.item.created": "added a checklist item",
  "checklist.item.updated": "updated a checklist item",
  "checklist.item.deleted": "deleted a checklist item",
  "checklist.item.toggled": "changed checklist completion",
  "comment.created": "added a comment",
  "comment.updated": "edited a comment",
  "comment.deleted": "deleted a comment",
  "attachment.uploaded": "added an attachment",
  "attachment.deleted": "removed an attachment",
  "comment.attachment.uploaded": "attached a file to a comment",
  "comment.attachment.deleted": "removed a comment attachment",
};

export function activityLabel(action: string): string {
  return labels[action] ?? action.replaceAll(".", " ").replaceAll("_", " ");
}
