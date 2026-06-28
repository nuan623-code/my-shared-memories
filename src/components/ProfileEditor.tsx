import { useEffect, useState } from "react";
import { UserCog, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function ProfileEditor() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, title")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.display_name ?? "");
        setTitle(data?.title ?? "");
      });
  }, [user?.id]);

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name.trim() || "匿名读者",
      title: title.trim() || "读者",
    });
    setSaving(false);
    if (error) setErr(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <form onSubmit={save} className="mb-8 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <UserCog className="h-4 w-4 text-primary" />
        评论身份
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">显示名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="你的昵称"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">头衔</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={30}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="例如：产品经理、AI 研究者"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <Check className="h-3 w-3" /> 已保存
          </span>
        )}
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </form>
  );
}
