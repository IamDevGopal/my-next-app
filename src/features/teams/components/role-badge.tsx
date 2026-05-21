"use client";

import { Crown, Eye, Pencil, Shield, UsersRound } from "lucide-react";

export type RoleBadgeSize = "sm" | "md" | "lg";

export interface RoleBadgeProps {
  role: string;
  size?: RoleBadgeSize;
  showIcon?: boolean;
  showTooltip?: boolean;
}

const roleConfig: Record<
  string,
  {
    label: string;
    icon: typeof Crown;
    bg: string;
    text: string;
    dot: string;
    description: string;
  }
> = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    bg: "bg-amber-50",
    text: "text-amber-800",
    dot: "bg-amber-500",
    description: "Full team governance: settings, members, invites, and resources",
  },
  EDITOR: {
    label: "Editor",
    icon: Pencil,
    bg: "bg-blue-50",
    text: "text-blue-800",
    dot: "bg-blue-500",
    description: "Active collaborator: create, edit tasks and comments",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    description: "Read-only access to team resources",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    icon: Shield,
    bg: "bg-purple-50",
    text: "text-purple-800",
    dot: "bg-purple-500",
    description: "Full platform control and management authority",
  },
  MANAGER: {
    label: "Manager",
    icon: UsersRound,
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    dot: "bg-cyan-500",
    description: "Delegated management with granted permissions",
  },
};

const sizeClasses: Record<RoleBadgeSize, string> = {
  sm: "gap-1 px-1.5 py-0.5 text-[10px]",
  md: "gap-1.5 px-2 py-1 text-xs",
  lg: "gap-1.5 px-2.5 py-1 text-sm",
};

const iconSizes: Record<RoleBadgeSize, string> = {
  sm: "size-2.5",
  md: "size-3.5",
  lg: "size-4",
};

const dotSizes: Record<RoleBadgeSize, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

export function RoleBadge({
  role,
  size = "md",
  showIcon = true,
  showTooltip = true,
}: RoleBadgeProps) {
  const config = roleConfig[role.toUpperCase()] ?? roleConfig.VIEWER;
  const Icon = config.icon;

  return (
    <span
      className={`group/badge relative inline-flex shrink-0 items-center rounded-full font-semibold ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {showIcon ? <Icon className={iconSizes[size]} /> : null}
      {config.label}
      <span
        className={`ml-0.5 inline-block rounded-full ${config.dot} ${dotSizes[size]}`}
      />
      {showTooltip ? (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition-all duration-150 group-hover/badge:pointer-events-auto group-hover/badge:opacity-100"
        >
          {config.description}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      ) : null}
    </span>
  );
}

export function getRoleBadgeVariant(role: string) {
  const config = roleConfig[role.toUpperCase()];
  return {
    bg: config?.bg ?? "bg-slate-100",
    text: config?.text ?? "text-slate-700",
    dot: config?.dot ?? "bg-slate-400",
  };
}
