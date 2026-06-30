export const AVATAR_PRESETS = [
  { id: "ocean",   label: "深海",   bg: "oklch(0.48 0.18 260)", text: "#ffffff" },
  { id: "sky",     label: "天空",   bg: "oklch(0.62 0.12 220)", text: "#ffffff" },
  { id: "forest",  label: "森林",   bg: "oklch(0.52 0.14 150)", text: "#ffffff" },
  { id: "amber",   label: "琥珀",   bg: "oklch(0.68 0.14 80)",  text: "#ffffff" },
  { id: "rose",    label: "玫瑰",   bg: "oklch(0.58 0.16 25)",  text: "#ffffff" },
  { id: "violet",  label: "紫罗兰", bg: "oklch(0.55 0.18 300)", text: "#ffffff" },
  { id: "slate",   label: "岩板",   bg: "oklch(0.45 0.06 260)", text: "#ffffff" },
  { id: "teal",    label: "青绿",   bg: "oklch(0.58 0.14 190)", text: "#ffffff" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

export function getPresetById(id: string | null | undefined) {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}
