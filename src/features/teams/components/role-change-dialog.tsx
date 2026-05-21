"use client";

import { Crown, Eye, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import type { TeamMemberData, TeamMemberRole } from "../types/team.type";
import { RoleBadge } from "./role-badge";

export interface RoleOption {
  value: Exclude<TeamMemberRole, "OWNER">;
  label: string;
  description: string;
  icon: typeof Crown;
}

const roleOptions: RoleOption[] = [
  {
    value: "EDITOR",
    label: "Editor",
    description: "Can create and edit tasks, post comments, and collaborate on team resources.",
    icon: Pencil,
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Can view team resources and tasks. Read-only access.",
    icon: Eye,
  },
];

export interface RoleChangeDialogProps {
  member: TeamMemberData;
  isOpen: boolean;
  isBusy: boolean;
  onConfirm: (memberId: string, role: Exclude<TeamMemberRole, "OWNER">) => void | Promise<void>;
  onClose: () => void;
}

export function RoleChangeDialog({
  member,
  isOpen,
  isBusy,
  onConfirm,
  onClose,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<Exclude<TeamMemberRole, "OWNER">>(
    member.role === "OWNER" ? "EDITOR" : member.role,
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={member.user.avatarUrl}
              name={member.user.name}
              size="md"
            />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-950">
                {member.user.name}
              </h3>
              <p className="truncate text-xs text-slate-500">
                {member.user.username ? `@${member.user.username}` : "Team member"}
              </p>
            </div>
          </div>
          <button
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            disabled={isBusy}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Current role
            </p>
            <div className="mt-1.5">
              <RoleBadge role={member.role} size="lg" />
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Change to new role
          </p>
          <div className="mt-3 space-y-2">
            {roleOptions.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = selectedRole === option.value;
              const isCurrent = option.value === member.role;

              return (
                <button
                  className={`flex w-full min-w-0 items-start gap-3 rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  disabled={isCurrent || isBusy}
                  key={option.value}
                  onClick={() => setSelectedRole(option.value)}
                  type="button"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
                      isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <OptionIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {option.label}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isBusy || selectedRole === member.role}
            onClick={() => void onConfirm(member.id, selectedRole)}
            type="button"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pencil className="size-4" />
            )}
            {isBusy ? "Changing..." : "Change role"}
          </button>
        </div>
      </div>
    </div>
  );
}
