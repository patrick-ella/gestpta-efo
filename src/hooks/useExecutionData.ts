import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";

type Execution = Database["public"]["Tables"]["executions"]["Row"];

export const useExecutionData = (exerciceId: string | null) => {
  const qc = useQueryClient();

  // Realtime subscription for live updates
  useEffect(() => {
    if (!exerciceId) return;
    const channel = supabase
      .channel(`executions-${exerciceId}-${Date.now()}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "executions",
      }, () => {
        qc.invalidateQueries({ queryKey: ["executions", exerciceId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [exerciceId, qc]);

  return useQuery({
    queryKey: ["executions", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const { data, error } = await supabase
        .from("executions")
        .select("*")
        .eq("exercice_id", exerciceId);
      if (error) throw error;
      return data as Execution[];
    },
    enabled: !!exerciceId,
    staleTime: 30 * 1000, // 30s for executions (more dynamic)
  });
};

export type ExecutionMap = Record<string, Execution>;

export function buildExecutionMap(executions: Execution[]): ExecutionMap {
  const map: ExecutionMap = {};
  for (const ex of executions) {
    map[ex.sous_tache_id] = ex;
  }
  return map;
}
