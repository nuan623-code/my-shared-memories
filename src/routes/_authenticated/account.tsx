import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, BookOpen, Shield, LogOut, Settings, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAdminStatus } from "@/hooks/use-is-admin";
import { fetchFavoriteResources } from "@/hooks/use-favorites";
import { fetchReadingResources } from "@/hooks/use-reading-status";
import { fetchResources } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { ProfileEditor } from "@/components/ProfileEditor";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "我的账号 — Mingyu's Library" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const navigate = useNavigate();
  const [readingTab, setReadingTab] = useState<"to_read" | "read" | "unread">("to_read");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, title, created_at, avatar_preset")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: favs, isLoading } = useQuery({
    queryKey: ["favorites", "resources", user?.id ?? null],
    enabled: !!user,
    queryFn: fetchFavoriteResources,
  });

  // 阅读进度(私有):待读 / 已读来自 reading_status,未读 = 全库减去两者
  const { data: toRead } = useQuery({
    queryKey: ["reading-status", "resources", "to_read", user?.id ?? null],
    enabled: !!user,
    queryFn: () => fetchReadingResources("to_read"),
  });
  const { data: readDone } = useQuery({
    queryKey: ["reading-status", "resources", "read", user?.id ?? null],
    enabled: !!user,
    queryFn: () => fetchReadingResources("read"),
  });
  const { data: allResources } = useQuery({
    queryKey: ["resources", "account-all"],
    enabled: !!user,
    queryFn: () => fetchResources({}),
  });
  const marked = new Set([...(toRead ?? []), ...(readDone ?? [])].map((r) => r.id));
  const unread = (allResources ?? []).filter((r) => !marked.has(r.id));

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "用户";
  const title = profile?.title ?? "读者";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <UserAvatar preset={profile?.avatar_preset} name={displayName} size="lg" className="border-2 border-primary/20" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {title}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {user?.email}
              </span>
              {user?.created_at && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  注册于 {new Date(user.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
              {adminLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  加载中...
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Shield className="h-3 w-3" />
                  管理员
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  普通用户
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.display_name && (
            <Link
              to="/u/$username"
              params={{ username: profile.display_name }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              查看公开主页
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Settings className="h-3.5 w-3.5" /> 管理后台
            </Link>
          )}

          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" /> 退出
          </button>
        </div>
      </header>

      <ProfileEditor />

      <section className="mb-10">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          阅读进度
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          只有你自己能看到。在资源卡片或文章页顶栏点「待读 / 已读」来标记。
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["to_read", "待读", toRead?.length],
              ["read", "已读", readDone?.length],
              ["unread", "未读", allResources ? unread.length : undefined],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setReadingTab(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                readingTab === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {label}
              {count !== undefined && <span className="ml-1 tabular-nums">{count}</span>}
            </button>
          ))}
        </div>
        {readingTab === "to_read" &&
          ((toRead?.length ?? 0) > 0 ? (
            <ResourceMasonry resources={toRead!} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              还没有待读文章——把想看的标成「待读」,它们会在这里排队
            </div>
          ))}
        {readingTab === "read" &&
          ((readDone?.length ?? 0) > 0 ? (
            <ResourceMasonry resources={readDone!} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              还没有已读记录——读完一篇就点「已读」记下来
            </div>
          ))}
        {readingTab === "unread" &&
          (unread.length > 0 ? (
            <ResourceMasonry resources={unread} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              全部读完了,厉害
            </div>
          ))}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Bookmark className="h-4 w-4 text-primary" />
          我的书架
          {favs && (
            <span className="text-xs font-normal text-muted-foreground">
              ({favs.length})
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
        ) : !favs || favs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
            书架还是空的，去
            <Link to="/resources" className="mx-1 text-primary hover:underline">
              资源库
            </Link>
            收藏一些内容吧
          </div>
        ) : (
          <ResourceMasonry resources={favs} />
        )}
      </section>
    </div>
  );
}
