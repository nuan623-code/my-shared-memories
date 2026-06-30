// Lightweight per-browser fingerprint stored in localStorage for anonymous
// like/view deduplication. Not a privacy tracker — just a random per-device id.
const KEY = "ml.fp";
export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    try { window.localStorage.setItem(KEY, v); } catch { /* ignore */ }
  }
  return v;
}
