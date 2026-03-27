import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Execution = Database["public"]["Tables"]["executions"]["Row"];

export const useExecutionData = (exerciceId: string | null) => {
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
