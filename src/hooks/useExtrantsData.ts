import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExtrantCritere {
  id: string;
  extrant_id: string;
  libelle: string;
  type_critere: string;
  date_echeance: string | null;
  seuil_valeur: number | null;
  seuil_unite: string | null;
  valide_manuellement: boolean;
  valide_auto: boolean;
  valide_final: boolean;
  ordre: number;
  sous_taches_liees?: CritereSousTache[];
}

export interface CritereSousTache {
  id: string;
  critere_id: string;
  sous_tache_id: string;
  condition_type: string;
  condition_seuil: number | null;
}

export interface Extrant {
  id: string;
  activite_id: string;
  reference: string;
  libelle: string;
  indicateur_mesure: string;
  statut: string;
  statut_mode: string;
  date_production: string | null;
  date_validation: string | null;
  valide_par: string | null;
  rejete_motif: string | null;
  ordre: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  criteres?: ExtrantCritere[];
}

export interface ActiviteWithExtrants {
  id: string;
  code: string;
  libelle: string;
  budget_total: number | null;
  extrants: Extrant[];
}

const OFFICIAL_CODES = ["30201", "30202", "30203", "30204", "30205"];

export function useExtrantsData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["extrants-data"],
    queryFn: async () => {
      const [actRes, extRes, critRes, liensRes] = await Promise.all([
        supabase.from("activites").select("id, code, libelle, budget_total").in("code", OFFICIAL_CODES).order("code"),
        supabase.from("extrants").select("*").order("ordre"),
        supabase.from("extrants_criteres").select("*").order("ordre"),
        supabase.from("criteres_sous_taches").select("*"),
      ]);

      const activites = actRes.data ?? [];
      const extrants = extRes.data ?? [];
      const criteres = critRes.data ?? [];
      const liens = liensRes.data ?? [];

      // Build criteres with linked sous-tâches
      const criteresMap = new Map<string, ExtrantCritere[]>();
      for (const c of criteres) {
        const cLinks = liens.filter((l: any) => l.critere_id === c.id);
        const critere: ExtrantCritere = {
          ...c,
          sous_taches_liees: cLinks,
        };
        const arr = criteresMap.get(c.extrant_id) ?? [];
        arr.push(critere);
        criteresMap.set(c.extrant_id, arr);
      }

      // Build extrants with criteres
      const extrantsMap = new Map<string, Extrant[]>();
      for (const e of extrants) {
        const ext: Extrant = {
          ...e,
          criteres: criteresMap.get(e.id) ?? [],
        };
        const arr = extrantsMap.get(e.activite_id) ?? [];
        arr.push(ext);
        extrantsMap.set(e.activite_id, arr);
      }

      // Deduplicate activites
      const seen = new Set<string>();
      const result: ActiviteWithExtrants[] = [];
      for (const a of activites) {
        if (!OFFICIAL_CODES.includes(a.code) || seen.has(a.id)) continue;
        seen.add(a.id);
        result.push({
          ...a,
          extrants: extrantsMap.get(a.id) ?? [],
        });
      }

      return result.sort((a, b) => a.code.localeCompare(b.code));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["extrants-data"] });

  return { ...query, invalidate };
}

export function useExtrantStats() {
  return useQuery({
    queryKey: ["extrants-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("extrants").select("statut");
      if (error) throw error;
      const all = data ?? [];
      const total = all.length;
      const produits = all.filter((e) => e.statut === "produit" || e.statut === "valide").length;
      const enCours = all.filter((e) => e.statut === "en_cours").length;
      const nonProduits = all.filter((e) => e.statut === "non_produit").length;
      const taux = total > 0 ? Math.round((produits / total) * 100) : 0;
      return { total, produits, enCours, nonProduits, taux };
    },
  });
}
