import { AVATAR_PRESETS, type AvatarPresetId } from "@/lib/avatar-presets";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

interface AvatarPresetPickerProps {
  value: AvatarPresetId | null;
  onChange: (id: AvatarPresetId | null) => void;
  name: string;
}

export function AvatarPresetPicker({ value, onChange, name }: AvatarPresetPickerProps) {
  return (
    <div className="space-y-2">
      <span className="block text-xs text-muted-foreground">头像预设</span>
      <div className="flex flex-wrap gap-3">
        {AVATAR_PRESETS.map((preset) => {
          const selected = value === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(selected ? null : preset.id)}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg border p-2 transition",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50",
              )}
              title={preset.label}
            >
              <UserAvatar preset={preset.id} name={name} size="md" />
              <span className="text-[10px] text-muted-foreground">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
