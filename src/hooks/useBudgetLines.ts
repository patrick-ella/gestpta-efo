import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface NomenclatureLine {
  id: string;
  code: string;
  libelle: string;
  famille: string | null;
  actif: boolean | null;
}

export interface SousTacheLigneBudgetaire {
  id: string;
  sous_tache_id: string;
  exercice_id: string;
  nomenclature_id: string;
  code_ligne: string;
  libelle_ligne: string;
  montant_prevu: number;
  montant_execute: number;
  observations: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const useNomenclature = () => {
  return useQuery({
    queryKey: ["nomenclature-budgetaire"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nomenclature_budgetaire")
        .select("*")
        .eq("actif", true)
        .order("code");
      if (error) throw error;
      return data as NomenclatureLine[];
    },
    staleTime: 10 * 60 * 1000, // 10min cache
  });
};

export const useSousTacheBudgetLines = (sousTacheId: string | null, exerciceId: string | null) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!sousTacheId) return;
    const channel = supabase
      .channel(`stlb-${sousTacheId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "sous_tache_lignes_budgetaires",
        filter: `sous_tache_id=eq.${sousTacheId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["budget-lines", sousTacheId] });
        qc.invalidateQueries({ queryKey: ["executions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sousTacheId, qc]);

  return useQuery({
    queryKey: ["budget-lines", sousTacheId, exerciceId],
    queryFn: async () => {
      if (!sousTacheId || !exerciceId) return [];
      const { data, error } = await supabase
        .from("sous_tache_lignes_budgetaires")
        .select("*")
        .eq("sous_tache_id", sousTacheId)
        .eq("exercice_id", exerciceId)
        .order("code_ligne");
      if (error) throw error;
      return data as SousTacheLigneBudgetaire[];
    },
    enabled: !!sousTacheId && !!exerciceId,
  });
};

export const useAddBudgetLines = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lines: { sous_tache_id: string; exercice_id: string; nomenclature_id: string; code_ligne: string; libelle_ligne: string }[]) => {
      const { error } = await supabase.from("sous_tache_lignes_budgetaires").insert(lines);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lines"] });
      qc.invalidateQueries({ queryKey: ["executions"] });
    },
  });
};

export const useUpdateBudgetLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; montant_prevu?: number; montant_execute?: number; observations?: string }) => {
      const { error } = await supabase.from("sous_tache_lignes_budgetaires").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lines"] });
      qc.invalidateQueries({ queryKey: ["executions"] });
    },
  });
};

export const useDeleteBudgetLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sous_tache_lignes_budgetaires").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lines"] });
      qc.invalidateQueries({ queryKey: ["executions"] });
    },
  });
};
