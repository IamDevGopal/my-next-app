import { UserRound } from "lucide-react";

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

export function UserAvatar({ avatarUrl, name, size = "md" }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (avatarUrl) {
    return (
      <div
        aria-label={name}
        className={`${SIZE_CLASSES[size]} rounded-md bg-cover bg-center`}
        role="img"
        style={{ backgroundImage: `url("${avatarUrl}")` }}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-md bg-emerald-700 font-semibold text-white`}
    >
      {initials || <UserRound className="size-5" />}
    </div>
  );
}
