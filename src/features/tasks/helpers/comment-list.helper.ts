import type { CommentData } from "../types/comment.type";

export function mergeComments(
  current: CommentData[],
  incoming: CommentData[],
): CommentData[] {
  const byId = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    const existing = byId.get(row.id);
    if (!existing || existing.updatedAt <= row.updatedAt) byId.set(row.id, row);
  }
  return [...byId.values()]
    .filter((row) => row.deletedAt === null)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
}
