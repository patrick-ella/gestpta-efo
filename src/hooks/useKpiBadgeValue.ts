import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KpiSeuilCondition {
  variable_index: number;
  min_value: number;
}

export interface KpiSeuil {
  id: string;
  ordre: number;
  label_statut: string;
  icon_statut: string | null;
  couleur: string | null;
  bg_couleur: string | null;
  conditions: KpiSeuilCondition[];
}

export interface KpiVariableValue {
  index: number;
  label: string | null;
  value: number;
  critere_libelle: string | null;
}

export interface KpiBadgeValue {
  badge: {
    id: string;
    code: string;
    label: string;
    icon: string | null;
    type_calcul: string;
  };
  variableValues: KpiVariableValue[];
  activeSeuil: KpiSeuil | null;
  // For type_calcul = 'somme' / 'moyenne' / 'valeur'
  computed: number | null;
}

export function useKpiBadgeValue(badgeCode: string) {
  return useQuery<KpiBadgeValue | null>({
    queryKey: ["kpi_connexion", badgeCode],
    queryFn: async () => {
      const { data: badge, error } = await supabase
        .from("kpi_badges" as any)
        .select(
          `
          id, code, label, icon, type_calcul,
          kpi_variables (
            id, variable_index, label_variable, critere_id,
            extrants_criteres ( id, libelle, valeur_realisee, type_critere )
          ),
          kpi_seuils ( id, ordre, label_statut, icon_statut, couleur, bg_couleur, conditions )
        `
        )
        .eq("code", badgeCode)
        .maybeSingle();
      if (error) throw error;
      if (!badge) return null;

      const b = badge as any;
      const variableValues: KpiVariableValue[] = (b.kpi_variables ?? [])
        .slice()
        .sort((a: any, z: any) => a.variable_index - z.variable_index)
        .map((v: any) => ({
          index: v.variable_index,
          label: v.label_variable,
          value: Number(v.extrants_criteres?.valeur_realisee ?? 0),
          critere_libelle: v.extrants_criteres?.libelle ?? null,
        }));

      const seuils: KpiSeuil[] = (b.kpi_seuils ?? [])
        .slice()
        .sort((a: any, z: any) => a.ordre - z.ordre)
        .map((s: any) => ({
          id: s.id,
          ordre: s.ordre,
          label_statut: s.label_statut,
          icon_statut: s.icon_statut,
          couleur: s.couleur,
          bg_couleur: s.bg_couleur,
          conditions: Array.isArray(s.conditions) ? s.conditions : [],
        }));

      const activeSeuil =
        seuils.find((s) =>
          (s.conditions ?? []).every((cond) => {
            const v = variableValues.find((vv) => vv.index === cond.variable_index);
            return (v?.value ?? 0) >= cond.min_value;
          })
        ) ?? null;

      let computed: number | null = null;
      if (b.type_calcul === "somme") {
        computed = variableValues.reduce((acc, v) => acc + v.value, 0);
      } else if (b.type_calcul === "moyenne") {
        computed = variableValues.length
          ? variableValues.reduce((acc, v) => acc + v.value, 0) / variableValues.length
          : 0;
      } else if (b.type_calcul === "valeur") {
        computed = variableValues[0]?.value ?? null;
      }

      return {
        badge: {
          id: b.id,
          code: b.code,
          label: b.label,
          icon: b.icon,
          type_calcul: b.type_calcul,
        },
        variableValues,
        activeSeuil,
        computed,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}
