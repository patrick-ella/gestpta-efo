import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Package } from "lucide-react";

const OFFICIAL_CODES = ['30201', '30202', '30203', '30204', '30205'];

const ActivitiesSummary = () => {
  const { data: activitesRaw, isLoading } = useQuery({
    queryKey: ["activites-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activites")
        .select("id, code, libelle, objectif_operationnel, budget_total, ordre")
        .in("code", OFFICIAL_CODES)
        .order("ordre");
      if (error) throw error;
      return data;
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["executions-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executions")
        .select("sous_tache_id, montant_realise, avancement_pct");
      if (error) throw error;
      return data;
    },
  });

  const { data: sousTachesRaw } = useQuery({
    queryKey: ["sous-taches-for-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sous_taches")
        .select("id, tache_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: tachesRaw } = useQuery({
    queryKey: ["taches-for-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taches")
        .select("id, activite_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch extrants per activity
  const { data: extrantsRaw } = useQuery({
    queryKey: ["extrants-per-activity-cl"],
    queryFn: async () => {
      const { data, error } = await supabase.from("extrants").select("activite_id, statut");
      if (error) throw error;
      return data;
    },
  });

  const extrantsMap: Record<string, { total: number; produits: number }> = {};
  (extrantsRaw ?? []).forEach((e) => {
    if (!extrantsMap[e.activite_id]) extrantsMap[e.activite_id] = { total: 0, produits: 0 };
    extrantsMap[e.activite_id].total++;
    if (e.statut === "produit" || e.statut === "valide") extrantsMap[e.activite_id].produits++;
  });

  // Filter to official codes and deduplicate by id
  const uniqueActivites = activitesRaw
    ? Array.from(new Map(
        activitesRaw
          .filter(a => OFFICIAL_CODES.includes(a.code))
          .map(a => [a.id, a])
      ).values())
        .sort((a, b) => a.code.localeCompare(b.code))
    : [];

  const missingCodes = OFFICIAL_CODES.filter(c => !uniqueActivites.some(a => a.code === c));
  if (uniqueActivites.length !== 5 && uniqueActivites.length > 0) {
    console.warn(`[CadreLogique] Expected 5 activities, got ${uniqueActivites.length}. Codes found: ${uniqueActivites.map(a => a.code).join(', ')}`);
  }

  // Build maps for per-activity stats
  const tacheToActivite: Record<string, string> = {};
  (tachesRaw ?? []).forEach(t => { tacheToActivite[t.id] = t.activite_id; });

  const stToActivite: Record<string, string> = {};
  (sousTachesRaw ?? []).forEach(st => {
    const actId = tacheToActivite[st.tache_id];
    if (actId) stToActivite[st.id] = actId;
  });

  // Compute per-activity stats
  const activityStats: Record<string, { totalRealized: number; pcts: number[] }> = {};
  (executions ?? []).forEach(e => {
    const actId = stToActivite[e.sous_tache_id];
    if (!actId) return;
    if (!activityStats[actId]) activityStats[actId] = { totalRealized: 0, pcts: [] };
    activityStats[actId].totalRealized += (e.montant_realise ?? 0);
    activityStats[actId].pcts.push(e.avancement_pct ?? 0);
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const globalAvg = executions && executions.length > 0
    ? Math.round(executions.reduce((s, e) => s + (e.avancement_pct ?? 0), 0) / executions.length)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Activités rattachées au Cadre Logique ({uniqueActivites.length})
        </h3>
        <Badge variant="outline" className="text-sm">
          Avancement moyen : {globalAvg}%
        </Badge>
      </div>
      {missingCodes.length > 0 && uniqueActivites.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {uniqueActivites.length} activité(s) sur 5 chargées. Codes manquants : {missingCodes.join(', ')}. Vérifiez la base de données.
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniqueActivites.map((act) => {
          const stats = activityStats[act.id];
          const actAvg = stats && stats.pcts.length > 0
            ? Math.round(stats.pcts.reduce((a, b) => a + b, 0) / stats.pcts.length)
            : 0;
          const actRealized = stats?.totalRealized ?? 0;
          const budgetExecPct = (act.budget_total ?? 0) > 0
            ? Math.round((actRealized / (act.budget_total ?? 1)) * 100)
            : 0;

          return (
            <Card key={act.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-secondary text-secondary-foreground text-xs">
                    {act.code}
                  </Badge>
                  {(() => {
                    const ext = extrantsMap[act.id];
                    if (!ext || ext.total === 0) return null;
                    const color = ext.produits === ext.total ? "bg-success/20 text-success-foreground" : ext.produits > 0 ? "bg-warning/20 text-warning-foreground" : "bg-destructive/10 text-destructive";
                    return <Badge className={`text-xs ${color}`}>📦 {ext.produits}/{ext.total}</Badge>;
                  })()}
                </div>
                <CardTitle className="text-sm font-semibold text-foreground leading-tight mt-1">
                  {act.libelle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {act.objectif_operationnel || "Objectif opérationnel non défini"}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Avancement physique</span>
                    <span>{actAvg}%</span>
                  </div>
                  <Progress value={actAvg} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Exécution budgétaire</span>
                    <span>{budgetExecPct}%</span>
                  </div>
                  <Progress value={budgetExecPct} className="h-1.5" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium text-foreground">
                    {actRealized > 0 ? `${(actRealized / 1000000).toFixed(1)}M` : "0"} / {(act.budget_total ?? 0) > 0 ? `${((act.budget_total ?? 0) / 1000000).toFixed(1)}M` : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ActivitiesSummary;
