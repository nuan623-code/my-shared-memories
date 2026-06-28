import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Resource } from "@/lib/resources";

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", "ids", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("resource_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.resource_id as string));
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ resourceId, on }: { resourceId: string; on: boolean }) => {
      if (!user) throw new Error("请先登录");
      if (on) {
        const { error } = await supabase
          .from("favorites")
          .insert({ resource_id: resourceId, user_id: user.id });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("resource_id", resourceId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export async function fetchFavoriteResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("created_at, resource:resources(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{ resource: Resource | null }>)
    .map((r) => r.resource)
    .filter((r): r is Resource => !!r);
}
