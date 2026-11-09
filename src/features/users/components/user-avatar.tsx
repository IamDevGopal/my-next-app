"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  lg: "size-14 text-lg",
  md: "size-11 text-base",
  sm: "size-9 text-sm",
} as const;

const SIZE_PIXELS = {
  lg: 56,
  md: 44,
  sm: 36,
} as const;

export function UserAvatar({ avatarUrl, name, size = "md" }: UserAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (avatarUrl && avatarUrl !== failedAvatarUrl) {
    return (
      <Image
        alt={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-md object-cover`}
        height={SIZE_PIXELS[size]}
        onError={() => setFailedAvatarUrl(avatarUrl)}
        src={avatarUrl}
        unoptimized
        width={SIZE_PIXELS[size]}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-md bg-emerald-700 font-semibold text-white`}
      role="img"
    >
      {initials || <UserRound className="size-5" />}
    </div>
  );
}
