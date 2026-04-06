import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Exercice {
  id: string;
  annee: number;
  statut: string | null;
  budget_total: number | null;
}

export function useActiveExercice() {
  return useQuery({
    queryKey: ["exercice_actif"],
    queryFn: async (): Promise<Exercice | null> => {
      // Priority 1: exercice with statut = 'actif'
      const { data: actif } = await supabase
        .from("exercices")
        .select("id, annee, statut, budget_total")
        .eq("statut", "actif")
        .order("annee", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (actif) return actif;

      // Priority 2: exercice with statut = 'en_cours'
      const { data: enCours } = await supabase
        .from("exercices")
        .select("id, annee, statut, budget_total")
        .eq("statut", "en_cours")
        .order("annee", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enCours) return enCours;

      // Priority 3: closest to current calendar year
      const currentYear = new Date().getFullYear();
      const { data: all } = await supabase
        .from("exercices")
        .select("id, annee, statut, budget_total")
        .order("annee", { ascending: false });

      if (!all || all.length === 0) return null;

      return all.reduce((prev, curr) =>
        Math.abs(curr.annee - currentYear) < Math.abs(prev.annee - currentYear) ? curr : prev
      );
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useActiveExerciceId(): string | null {
  const { data } = useActiveExercice();
  return data?.id ?? null;
}

export function useActiveExerciceAnnee(): number | null {
  const { data } = useActiveExercice();
  return data?.annee ?? null;
}
