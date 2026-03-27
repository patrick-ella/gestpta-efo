import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Activite = Database["public"]["Tables"]["activites"]["Row"];
type Tache = Database["public"]["Tables"]["taches"]["Row"];
type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

export interface PtaActivite extends Activite {
  taches: PtaTache[];
}

export interface PtaTache extends Tache {
  sous_taches: SousTache[];
}

export const usePtaData = (exerciceAnnee: number = 2026) => {
  return useQuery({
    queryKey: ["pta-data", exerciceAnnee],
    queryFn: async () => {
      // Get exercice
      const { data: exercice, error: exErr } = await supabase
        .from("exercices")
        .select("*")
        .eq("annee", exerciceAnnee)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!exercice) return { exercice: null, activites: [] };

      // Get all activites for this exercice
      const { data: activites, error: actErr } = await supabase
        .from("activites")
        .select("*")
        .eq("exercice_id", exercice.id)
        .order("ordre");
      if (actErr) throw actErr;

      if (!activites || activites.length === 0)
        return { exercice, activites: [] };

      // Get all taches for these activites
      const actIds = activites.map((a) => a.id);
      const { data: taches, error: tErr } = await supabase
        .from("taches")
        .select("*")
        .in("activite_id", actIds)
        .order("ordre");
      if (tErr) throw tErr;

      // Get all sous_taches
      const tacheIds = (taches ?? []).map((t) => t.id);
      let sousTaches: SousTache[] = [];
      if (tacheIds.length > 0) {
        const { data: st, error: stErr } = await supabase
          .from("sous_taches")
          .select("*")
          .in("tache_id", tacheIds)
          .order("ordre");
        if (stErr) throw stErr;
        sousTaches = st ?? [];
      }

      // Nest
      const ptaActivites: PtaActivite[] = activites.map((act) => ({
        ...act,
        taches: (taches ?? [])
          .filter((t) => t.activite_id === act.id)
          .map((t) => ({
            ...t,
            sous_taches: sousTaches.filter((st) => st.tache_id === t.id),
          })),
      }));

      return { exercice, activites: ptaActivites };
    },
  });
};
