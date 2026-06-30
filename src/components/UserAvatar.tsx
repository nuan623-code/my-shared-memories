import { cn } from "@/lib/utils";
import { getPresetById } from "@/lib/avatar-presets";

interface UserAvatarProps {
  preset?: string | null;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-base",
};

export function UserAvatar({ preset, name, className, size = "md" }: UserAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const matched = getPresetById(preset);

  if (matched) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold",
          sizeMap[size],
          className,
        )}
        style={{ background: matched.bg, color: matched.text }}
        aria-label={`${name} 的头像`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground",
        sizeMap[size],
        className,
      )}
      aria-label={`${name} 的头像`}
    >
      {initial}
    </div>
  );
}
