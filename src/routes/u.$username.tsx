import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import type { AvatarPresetId } from "@/lib/avatar-presets";

interface PublicProfile {
  id: string;
  display_name: string;
  title: string;
  avatar_preset: AvatarPresetId | null;
}

async function loadProfile(username: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, title, avatar_preset")
    .eq("display_name", username)
    .maybeSingle();
  if (!profile) return null;

  const [notesRes, commentsRes] = await Promise.all([
    supabase.from("resources")
      .select("id, slug, title, summary, published_at, type")
      .eq("owner_id", profile.id).order("published_at", { ascending: false }).limit(50),
    supabase.from("comments")
      .select("id, content, created_at, resource_id")
      .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return { profile: profile as PublicProfile, posts: notesRes.data ?? [], comments: commentsRes.data ?? [] };
}

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const result = await loadProfile(params.username);
    if (!result) throw notFound();
    return result;
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} 的主页 — Mingyu's Library` },
      { name: "description", content: `${params.username} 在 Mingyu's Library 发布的内容` },
    ],
  }),
  component: PublicProfilePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center text-sm text-muted-foreground">用户不存在</div>,
});

function PublicProfilePage() {
  const { profile, posts, comments } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <UserAvatar preset={profile.avatar_preset} name={profile.display_name} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.title}</p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">发布内容</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无内容</p>
        ) : (
          <div className="grid gap-2">
            {posts.map((p) => (
              <Link key={p.id}
                to={p.type === "article" && p.slug ? "/articles/$slug" : "/notes"}
                params={p.type === "article" && p.slug ? { slug: p.slug } : undefined as never}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2.5 transition hover:border-primary/40 hover:bg-muted/30">
                <span className="line-clamp-1 text-sm text-foreground">{p.title || p.summary || "(无标题)"}</span>
                <span className="text-xs text-muted-foreground">{new Date(p.published_at).toLocaleDateString("zh-CN")}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">最近评论</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无评论</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-md border border-border bg-card px-4 py-2.5">
                <p className="line-clamp-2 text-sm text-foreground">{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("zh-CN")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
