// Reading-time estimate. Counts Chinese chars + English words.
export function readingMinutes(text: string | null | undefined): number {
  if (!text) return 1;
  const stripped = text.replace(/<[^>]+>/g, " ");
  const chinese = (stripped.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = (stripped.match(/[A-Za-z]+/g) || []).length;
  // Chinese ~ 400 cpm, English ~ 200 wpm
  const mins = Math.ceil(chinese / 400 + english / 200);
  return Math.max(1, mins);
}

// Extract #tags from markdown/text body (Chinese & English allowed)
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const re = /#([\p{L}\p{N}_-]{1,32})/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1]);
  return [...out];
}
