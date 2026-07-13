import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Resource } from "@/lib/resources";

export type ReadingState = "read" | "to_read";

export function useReadingMap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-status", "map", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_status")
        .select("resource_id, status");
      if (error) throw error;
      return new Map(
        (data ?? []).map((r) => [r.resource_id as string, r.status as ReadingState]),
      );
    },
  });
}

export function useSetReadingStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resourceId,
      status,
    }: {
      resourceId: string;
      status: ReadingState | null; // null = 清除标记(回到未读)
    }) => {
      if (!user) throw new Error("请先登录");
      if (status) {
        const { error } = await supabase
          .from("reading_status")
          .upsert(
            { resource_id: resourceId, user_id: user.id, status },
            { onConflict: "user_id,resource_id" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reading_status")
          .delete()
          .eq("resource_id", resourceId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reading-status"] });
    },
  });
}

export async function fetchReadingResources(status: ReadingState): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("reading_status")
    .select("updated_at, resource:resources(*)")
    .eq("status", status)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{ resource: Resource | null }>)
    .map((r) => r.resource)
    .filter((r): r is Resource => !!r);
}
