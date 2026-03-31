import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ExecutionMap } from "@/hooks/useExecutionData";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

export interface AvancementSuggestion {
  suggested: number;
  tauxFinancier: number;
  tauxLivrables: number;
  nbLivrablesTotal: number;
  nbLivrablesProduits: number;
  explanation: string;
}

export interface AvancementBlockResult {
  blocked: boolean;
  blockMessage: string | null;
  warnings: AvancementWarning[];
}

export interface AvancementWarning {
  type: "budget_low" | "decrease" | "future_trimestre";
  message: string;
  requiresJustification?: boolean;
}

const PALIER_LABELS: Record<number, string> = {
  0: "Non démarrée",
  25: "Démarrée",
  50: "En cours",
  75: "Avancée",
  100: "Terminée",
};

const PALIER_COLORS: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  25: "bg-destructive/80 text-destructive-foreground",
  50: "bg-warning text-warning-foreground",
  75: "bg-warning/60 text-warning-foreground",
  100: "bg-success text-success-foreground",
};

export function getPalierLabel(pct: number): string {
  return PALIER_LABELS[pct] ?? `${pct}%`;
}

export function getPalierColor(pct: number): string {
  return PALIER_COLORS[pct] ?? "bg-muted text-muted-foreground";
}

export function getAutoStatut(pct: number): string {
  if (pct === 0) return "non_demarre";
  if (pct === 100) return "termine";
  return "en_cours";
}

function roundToPalier(score: number): number {
  if (score < 12.5) return 0;
  if (score < 37.5) return 25;
  if (score < 62.5) return 50;
  if (score < 87.5) return 75;
  return 100;
}

function getCurrentTrimestre(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function getTrimestreScore(st: SousTache): number {
  const current = getCurrentTrimestre();
  const programmed: number[] = [];
  if (st.trimestre_t1) programmed.push(1);
  if (st.trimestre_t2) programmed.push(2);
  if (st.trimestre_t3) programmed.push(3);
  if (st.trimestre_t4) programmed.push(4);
  if (programmed.length === 0) return 0;
  const last = Math.max(...programmed);
  const first = Math.min(...programmed);
  if (current > last) return 1;
  if (current >= first) return 0.5;
  return 0;
}

export function computeSuggestion(
  st: SousTache,
  executionMap: ExecutionMap,
  livrables: { statut: string | null }[]
): AvancementSuggestion {
  const ex = executionMap[st.id];
  const budgetPrevu = st.budget_prevu ?? 0;
  const montantRealise = ex?.montant_realise ?? 0;
  const tauxFinancier = budgetPrevu > 0 ? (montantRealise / budgetPrevu) * 100 : 0;

  const nbTotal = livrables.length;
  const nbProduits = livrables.filter(
    (l) => l.statut === "produit" || l.statut === "valide"
  ).length;
  const tauxLivrables = nbTotal > 0 ? (nbProduits / nbTotal) * 100 : 0;

  const trimScore = getTrimestreScore(st);

  let score = 0;
  score += (tauxFinancier / 100) * 40;
  score += (tauxLivrables / 100) * 40;
  score += trimScore * 20;

  const suggested = roundToPalier(score);

  const parts: string[] = [];
  parts.push(`${Math.round(tauxFinancier)}% exécution budgétaire`);
  if (nbTotal > 0) parts.push(`${nbProduits}/${nbTotal} livrables produits`);
  const explanation = `basé sur ${parts.join(" et ")}`;

  return { suggested, tauxFinancier, tauxLivrables, nbLivrablesTotal: nbTotal, nbLivrablesProduits: nbProduits, explanation };
}

export function checkAvancementRules(
  newPct: number,
  currentPct: number,
  st: SousTache,
  executionMap: ExecutionMap,
  livrables: { statut: string | null }[]
): AvancementBlockResult {
  const ex = executionMap[st.id];
  const budgetPrevu = st.budget_prevu ?? 0;
  const montantRealise = ex?.montant_realise ?? 0;
  const warnings: AvancementWarning[] = [];

  // BLOCK: 100% with unproduced livrables
  if (newPct === 100 && livrables.length > 0) {
    const unproduced = livrables.filter((l) => l.statut === "non_produit");
    if (unproduced.length > 0) {
      return {
        blocked: true,
        blockMessage: `Impossible de marquer cette sous-tâche à 100% : ${unproduced.length} livrable(s) ne sont pas encore produits. Produisez tous les livrables ou marquez-les comme non applicables avant de clôturer.`,
        warnings: [],
      };
    }
  }

  // WARNING: 100% with budget < 50%
  if (newPct === 100 && budgetPrevu > 0) {
    const tauxBudget = montantRealise / budgetPrevu;
    if (tauxBudget < 0.5) {
      warnings.push({
        type: "budget_low",
        message: `Vous marquez cette sous-tâche comme terminée alors que seulement ${Math.round(tauxBudget * 100)}% du budget a été consommé. Confirmez-vous ?`,
      });
    }
  }

  // WARNING: decrease from 75%+
  if (newPct < currentPct && currentPct >= 75) {
    warnings.push({
      type: "decrease",
      message: `Vous réduisez l'avancement de ${currentPct}% à ${newPct}%. Veuillez indiquer la raison :`,
      requiresJustification: true,
    });
  }

  // WARNING: > 0% on future trimestre
  if (newPct > 0 && currentPct === 0) {
    const current = getCurrentTrimestre();
    const programmed: number[] = [];
    if (st.trimestre_t1) programmed.push(1);
    if (st.trimestre_t2) programmed.push(2);
    if (st.trimestre_t3) programmed.push(3);
    if (st.trimestre_t4) programmed.push(4);
    if (programmed.length > 0) {
      const first = Math.min(...programmed);
      if (current < first) {
        warnings.push({
          type: "future_trimestre",
          message: `Cette sous-tâche est programmée à partir de T${first}. Êtes-vous sûr de vouloir démarrer son avancement maintenant ?`,
        });
      }
    }
  }

  return { blocked: false, blockMessage: null, warnings };
}

/** Bulk-fetch livrables for all sous-tâches in the exercise */
export function useAllLivrables(sousTacheIds: string[]) {
  return useQuery({
    queryKey: ["execution-livrables", sousTacheIds.sort().join(",")],
    queryFn: async () => {
      if (sousTacheIds.length === 0) return {};
      // Fetch in batches of 100
      const map: Record<string, { statut: string | null }[]> = {};
      for (let i = 0; i < sousTacheIds.length; i += 100) {
        const batch = sousTacheIds.slice(i, i + 100);
        const { data } = await supabase
          .from("livrables")
          .select("sous_tache_id, statut")
          .in("sous_tache_id", batch);
        (data ?? []).forEach((l) => {
          if (l.sous_tache_id) {
            if (!map[l.sous_tache_id]) map[l.sous_tache_id] = [];
            map[l.sous_tache_id].push({ statut: l.statut });
          }
        });
      }
      return map;
    },
    enabled: sousTacheIds.length > 0,
    staleTime: 60 * 1000,
  });
}

/** Fetch avancement audit history for a sous-tâche */
export function useAvancementHistory(sousTacheId: string | null) {
  return useQuery({
    queryKey: ["avancement-history", sousTacheId],
    queryFn: async () => {
      if (!sousTacheId) return [];
      const { data } = await supabase
        .from("journal_audit")
        .select("*")
        .eq("entite", "execution")
        .order("created_at", { ascending: false })
        .limit(10);
      // Filter client-side for this sous-tâche
      return (data ?? []).filter((entry) => {
        const nv = entry.nouvelle_valeur as any;
        const av = entry.ancienne_valeur as any;
        return nv?.sous_tache_id === sousTacheId || av?.sous_tache_id === sousTacheId;
      });
    },
    enabled: !!sousTacheId,
  });
}
