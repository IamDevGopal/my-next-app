"use client";

import type { PresenceStatus } from "../hooks/use-presence-socket";

export interface OnlineIndicatorProps {
  isOnline: boolean;
  status?: PresenceStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ONLINE: "bg-emerald-500",
  AWAY: "bg-amber-400",
  BUSY: "bg-red-500",
  OFFLINE: "bg-neutral-400",
};

const STATUS_LABELS: Record<PresenceStatus, string> = {
  ONLINE: "Online",
  AWAY: "Away",
  BUSY: "Busy",
  OFFLINE: "Offline",
};

const SIZE_MAP = {
  sm: "h-2 w-2 ring-1",
  md: "h-2.5 w-2.5 ring-2",
  lg: "h-3 w-3 ring-2",
};

export function OnlineIndicator({
  isOnline,
  status = "OFFLINE",
  size = "sm",
  showLabel = false,
}: OnlineIndicatorProps) {
  const displayStatus = isOnline ? (status === "OFFLINE" ? "ONLINE" : status) : "OFFLINE";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={STATUS_LABELS[displayStatus]}
    >
      <span
        className={`inline-block rounded-full ${SIZE_MAP[size]} ring-white ${STATUS_COLORS[displayStatus]} ${
          displayStatus === "ONLINE"
            ? "animate-pulse"
            : ""
        }`}
      />
      {showLabel && (
        <span className="text-[10px] font-medium text-neutral-500">
          {STATUS_LABELS[displayStatus]}
        </span>
      )}
    </span>
  );
}
