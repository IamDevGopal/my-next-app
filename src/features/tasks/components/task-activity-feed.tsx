"use client";

import { activityLabel } from "../helpers/task-activity.helper";
import { formatTaskTime } from "../helpers/task-time.helper";
import { formatEnum } from "../helpers/task-display.helper";
import type { TaskActivityPage } from "../types/task-resources.type";
import { buttonClass } from "../constants/task-resource.styles";

export function TaskActivityFeed({
  activity,
  busy,
  onMore,
}: {
  activity: TaskActivityPage;
  busy: boolean;
  onMore: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {!activity.activities.length ? (
        <p className="text-sm text-slate-500">No recorded activity yet.</p>
      ) : null}
      <ol className="space-y-3">
        {activity.activities.map((row) => (
          <li
            key={row.id}
            className="rounded-md border border-slate-200 p-3 text-sm"
          >
            <p>
              <strong>{row.actor?.name ?? "System"}</strong> ·{" "}
              {activityLabel(row.action)}
            </p>
            {typeof row.metadata?.name === "string" ? (
              <p className="text-slate-600">{row.metadata.name}</p>
            ) : null}
            {typeof row.metadata?.status === "string" ? (
              <p className="text-slate-600">
                Status: {formatEnum(row.metadata.status)}
              </p>
            ) : null}
            <time className="text-xs text-slate-500" dateTime={row.createdAt}>
              {formatTaskTime(row.createdAt)}
            </time>
          </li>
        ))}
      </ol>
      {activity.hasMore ? (
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => void onMore()}
        >
          Load older activity
        </button>
      ) : null}
    </div>
  );
}
