import { supabase } from "@/integrations/supabase/client";

export const fmtFCFA = (n: number | null | undefined) => {
  if (n == null) return "0 FCFA";
  return n.toLocaleString("fr-FR").replace(/,/g, " ") + " FCFA";
};

export const fmtPct = (n: number | null | undefined) =>
  n != null ? `${Math.round(n)}%` : "0%";

export interface ReportData {
  activites: any[];
  taches: any[];
  sousTaches: any[];
  executions: any[];
  kpis: any[];
}

export const fetchReportData = async (exerciceId?: string): Promise<ReportData> => {
  const queries = [
    supabase.from("activites").select("*").order("ordre"),
    supabase.from("taches").select("*").order("ordre"),
    supabase.from("sous_taches").select("*").order("ordre"),
    supabase.from("executions").select("*"),
    supabase.from("indicateurs_kpi").select("*"),
  ] as const;

  const [actRes, tachRes, stRes, exRes, kpiRes] = await Promise.all(queries);

  let activites = actRes.data || [];
  let taches = tachRes.data || [];
  let sousTaches = stRes.data || [];
  let executions = exRes.data || [];

  if (exerciceId) {
    activites = activites.filter((a) => a.exercice_id === exerciceId);
    executions = executions.filter((e) => e.exercice_id === exerciceId);
    const actIds = new Set(activites.map((a) => a.id));
    taches = taches.filter((t) => actIds.has(t.activite_id));
    const tacheIds = new Set(taches.map((t) => t.id));
    sousTaches = sousTaches.filter((st) => tacheIds.has(st.tache_id));
  }

  return { activites, taches, sousTaches, executions, kpis: kpiRes.data || [] };
};

export const getExecForST = (executions: any[], stId: string) =>
  executions.find((e: any) => e.sous_tache_id === stId);
