import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardKpiCards from "@/components/dashboard/DashboardKpiCards";
import ActivityMatrix from "@/components/dashboard/ActivityMatrix";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import AlertPanel, { type Alert } from "@/components/dashboard/AlertPanel";
import { useExtrantStats } from "@/hooks/useExtrantsData";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useKpiBadgeValue } from "@/hooks/useKpiBadgeValue";
import RequirePermission from "@/components/auth/RequirePermission";
import { MODULES } from "@/lib/constants/modules";
import type { Database } from "@/integrations/supabase/types";

type Execution = Database["public"]["Tables"]["executions"]["Row"];

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { data: roles = [] } = useUserRoles();
  const queryClient = useQueryClient();

  useRealtimeSync({ table: "executions", queryKeys: ["dashboard-data"] });
  useRealtimeSync({ table: "sous_tache_lignes_budgetaires", queryKeys: ["dashboard-data"] });
  useRealtimeSync({ table: "extrants", queryKeys: ["extrants-stats"] });

  // Realtime sync for KPI badge connections — instant updates when admin changes config
  // or when underlying criteria values change.
  const kpiQueryKeys = [
    ["kpi_connexion", "trainair_plus"],
    ["kpi_connexion", "avsec"],
    ["kpi_connexion", "iso"],
    ["kpi_connexion", "apprenants"],
  ];
  useRealtimeSync({ table: "extrants_criteres", queryKeys: kpiQueryKeys });
  useRealtimeSync({ table: "kpi_seuils", queryKeys: kpiQueryKeys });
  useRealtimeSync({ table: "kpi_variables", queryKeys: kpiQueryKeys });
  useRealtimeSync({ table: "kpi_badges", queryKeys: kpiQueryKeys });

  // Configurable KPI badges (override hardcoded indicateurs_kpi values when configured)
  const trainairBadge = useKpiBadgeValue("trainair_plus").data;
  const avsecBadge = useKpiBadgeValue("avsec").data;
  const isoBadge = useKpiBadgeValue("iso").data;
  const apprenantsBadge = useKpiBadgeValue("apprenants").data;

  const isDirection =
    roles.includes("super_admin") ||
    roles.includes("admin_pta") ||
    roles.includes("consultant");

  const { data: exercice } = useQuery({
    queryKey: ["dashboard-exercice", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercices")
        .select("*")
        .eq("annee", selectedYear)
        .maybeSingle();
      return data;
    },
  });

  const exerciceId = exercice?.id;

  const { data: activites = [] } = useQuery({
    queryKey: ["dashboard-activites", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const { data } = await supabase
        .from("activites")
        .select("*")
        .eq("exercice_id", exerciceId)
        .order("ordre");
      return data ?? [];
    },
    enabled: !!exerciceId,
  });

  const { data: taches = [] } = useQuery({
    queryKey: ["dashboard-taches", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const actIds = activites.map((a) => a.id);
      if (actIds.length === 0) return [];
      const { data } = await supabase
        .from("taches")
        .select("*")
        .in("activite_id", actIds);
      return data ?? [];
    },
    enabled: activites.length > 0,
  });

  const { data: sousTaches = [] } = useQuery({
    queryKey: ["dashboard-sous-taches", exerciceId],
    queryFn: async () => {
      const tacheIds = taches.map((t) => t.id);
      if (tacheIds.length === 0) return [];
      const { data } = await supabase
        .from("sous_taches")
        .select("*")
        .in("tache_id", tacheIds);
      return data ?? [];
    },
    enabled: taches.length > 0,
  });

  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["dashboard-executions", exerciceId],
    queryFn: async () => {
      if (!exerciceId) return [];
      const { data } = await supabase
        .from("executions")
        .select("*")
        .eq("exercice_id", exerciceId);
      return data ?? [];
    },
    enabled: !!exerciceId,
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const { data } = await supabase.from("indicateurs_kpi").select("*");
      return data ?? [];
    },
  });

  const { data: extrantStats } = useExtrantStats();

  // Fetch per-activity extrant counts
  const { data: extrantsPerActivity = [] } = useQuery({
    queryKey: ["dashboard-extrants-per-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("extrants").select("activite_id, statut");
      return data ?? [];
    },
  });

  const exMap = useMemo(() => {
    const m: Record<string, Execution> = {};
    executions.forEach((e) => (m[e.sous_tache_id] = e));
    return m;
  }, [executions]);

  const tacheActMap = useMemo(() => {
    const m: Record<string, string> = {};
    taches.forEach((t) => (m[t.id] = t.activite_id));
    return m;
  }, [taches]);

  const totalBudgetPrevu = sousTaches.reduce((s, st) => s + (st.budget_prevu ?? 0), 0);
  const totalRealized = executions.reduce((s, e) => s + (e.montant_realise ?? 0), 0);
  const totalEngage = executions.reduce((s, e) => s + ((e as any).montant_engage ?? 0), 0);
  const budgetExecPct = totalBudgetPrevu > 0 ? Math.round((totalRealized / totalBudgetPrevu) * 100) : 0;

  const budgetKpis = {
    totalPrevu: totalBudgetPrevu,
    totalEngage,
    totalRealise: totalRealized,
    tauxEngagement: totalBudgetPrevu > 0 ? Math.round((totalEngage / totalBudgetPrevu) * 1000) / 10 : 0,
    tauxRealisation: totalBudgetPrevu > 0 ? Math.round((totalRealized / totalBudgetPrevu) * 1000) / 10 : 0,
  };

  const allPcts = sousTaches.map((st) => exMap[st.id]?.avancement_pct ?? 0);
  const physicalProgress = allPcts.length > 0 ? Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length) : 0;

  const os1Kpi = kpis.find((k) => k.code === "OS1-IND1");
  const isoKpi = kpis.find((k) => k.code === "OS2-IND3");
  const trainairKpi = kpis.find((k) => k.code === "OS2-IND1");
  const avsecKpi = kpis.find((k) => k.code === "OS2-IND2");

  // Apprenants — prefer configured KPI badge value (somme) when set, otherwise fall back
  const apprenantsConfigured =
    apprenantsBadge && apprenantsBadge.variableValues.length > 0
      ? Math.round(apprenantsBadge.computed ?? 0)
      : null;
  const apprenants = {
    realized:
      apprenantsConfigured ??
      (os1Kpi?.valeur_realisee ? parseInt(os1Kpi.valeur_realisee.replace(/\s/g, "")) || 0 : 0),
    target: 1200,
  };

  // ISO — prefer configured KPI badge value (single value) when set
  const isoConfigured =
    isoBadge && isoBadge.variableValues.length > 0 ? Number(isoBadge.computed ?? 0) : null;
  const isoConformity =
    isoConfigured ??
    (isoKpi?.valeur_realisee
      ? parseFloat(isoKpi.valeur_realisee.replace(",", ".").replace("%", "")) || 0
      : 0);

  const activityRows = useMemo(() => {
    return activites.map((act) => {
      const actTaches = taches.filter((t) => t.activite_id === act.id);
      const actSts = sousTaches.filter((st) => actTaches.some((t) => t.id === st.tache_id));
      const budgetPrevu = actSts.reduce((s, st) => s + (st.budget_prevu ?? 0), 0);
      const budgetConsomme = actSts.reduce((s, st) => s + (exMap[st.id]?.montant_realise ?? 0), 0);
      const pcts = actSts.map((st) => exMap[st.id]?.avancement_pct ?? 0);
      const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
      const tauxBudg = budgetPrevu > 0 ? Math.round((budgetConsomme / budgetPrevu) * 100) : 0;

      const actExtrants = extrantsPerActivity.filter((e) => e.activite_id === act.id);
      const extTotal = actExtrants.length;
      const extProduits = actExtrants.filter((e) => e.statut === "produit" || e.statut === "valide").length;

      return {
        id: act.id,
        code: act.code,
        libelle: act.libelle,
        budgetPrevu: act.budget_total ?? 0,
        budgetConsomme,
        tauxBudgetaire: tauxBudg,
        avancementPhysique: avgPct,
        extrantsProduits: extProduits,
        extrantsTotal: extTotal,
      };
    });
  }, [activites, taches, sousTaches, exMap, extrantsPerActivity]);

  const budgetChartData = activityRows.map((a) => ({
    name: a.code,
    prevu: a.budgetPrevu,
    consomme: a.budgetConsomme,
  }));

  const statutCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Non démarré": 0,
      "En cours": 0,
      "Terminé": 0,
      "Suspendu": 0,
      "Annulé": 0,
    };
    const statusMap: Record<string, string> = {
      non_demarre: "Non démarré",
      en_cours: "En cours",
      termine: "Terminé",
      suspendu: "Suspendu",
      annule: "Annulé",
    };
    sousTaches.forEach((st) => {
      const ex = exMap[st.id];
      const statut = ex?.statut ?? "non_demarre";
      const label = statusMap[statut] ?? "Non démarré";
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return counts;
  }, [sousTaches, exMap]);

  const statutChartData = [
    { name: "Non démarré", value: statutCounts["Non démarré"], color: "hsl(210, 15%, 75%)" },
    { name: "En cours", value: statutCounts["En cours"], color: "hsl(211, 55%, 45%)" },
    { name: "Terminé", value: statutCounts["Terminé"], color: "hsl(120, 26%, 55%)" },
    { name: "Suspendu", value: statutCounts["Suspendu"], color: "hsl(35, 90%, 55%)" },
    { name: "Annulé", value: statutCounts["Annulé"], color: "hsl(0, 70%, 55%)" },
  ].filter((d) => d.value > 0);

  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const currentMonth = new Date().getMonth();
    const currentTrimestre = Math.floor(currentMonth / 3) + 1;

    sousTaches.forEach((st) => {
      const ex = exMap[st.id];
      const pct = ex?.avancement_pct ?? 0;
      const budgetSt = st.budget_prevu ?? 0;
      const realized = ex?.montant_realise ?? 0;

      const tacheParent = taches.find((t) => t.id === st.tache_id);
      const actParent = tacheParent ? activites.find((a) => a.id === tacheParent.activite_id) : null;
      const actCode = actParent?.code ?? "—";

      const pastTrim = [
        currentTrimestre >= 2 && st.trimestre_t1,
        currentTrimestre >= 3 && st.trimestre_t2,
        currentTrimestre >= 4 && st.trimestre_t3,
      ];
      if (pct === 0 && pastTrim.some(Boolean)) {
        result.push({
          type: "critical",
          actCode,
          stCode: st.code,
          description: "Avancement à 0% alors que le trimestre programmé est dépassé",
        });
      }

      if (budgetSt > 0) {
        const budgetPct = (realized / budgetSt) * 100;
        if (budgetPct > 90 && pct < 70) {
          result.push({
            type: "warning",
            actCode,
            stCode: st.code,
            description: `Budget consommé à ${Math.round(budgetPct)}% mais avancement physique à ${pct}%`,
          });
        }
      }
    });

    if (Math.abs(physicalProgress - budgetExecPct) > 20) {
      result.unshift({
        type: "warning",
        actCode: "GLOBAL",
        stCode: "—",
        description: `Écart significatif entre l'avancement physique (${physicalProgress}%) et l'exécution budgétaire (${budgetExecPct}%). Vérifiez la cohérence des données.`,
      });
    }

    return result;
  }, [sousTaches, exMap, taches, activites, physicalProgress, budgetExecPct]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-exercice"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-activites"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-taches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-sous-taches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-executions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    setLastRefresh(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement du tableau de bord…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {/* Application full name - dashboard only */}
          <p
            className="text-2xl font-extrabold tracking-tight mb-2 text-[#1F4E79] dark:text-[#38BDF8]"
            style={{
              filter: 'drop-shadow(0 1px 4px rgba(56,189,248,0.2))',
            }}
          >
            Gestion de la Performance de l'EFO
          </p>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-xs text-muted-foreground">
            {isDirection ? "Vue Direction" : "Vue Opérationnelle"} · Dernière actualisation :{" "}
            {lastRefresh.toLocaleTimeString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">Exercice 2025</SelectItem>
              <SelectItem value="2026">Exercice 2026</SelectItem>
              <SelectItem value="2027">Exercice 2027</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>
      </div>

      <DashboardKpiCards
        apprenants={apprenants}
        physicalProgress={physicalProgress}
        isoConformity={isoConformity}
        budgetKpis={budgetKpis}
        trainairPlus={{
          realized:
            trainairBadge?.activeSeuil
              ? `${trainairBadge.activeSeuil.icon_statut ?? ""} ${trainairBadge.activeSeuil.label_statut}`.trim()
              : trainairKpi?.valeur_realisee ?? null,
          target: trainairKpi?.cible_2027 ?? "Gold Member",
        }}
        centreAvsec={{
          realized:
            avsecBadge?.activeSeuil
              ? `${avsecBadge.activeSeuil.icon_statut ?? ""} ${avsecBadge.activeSeuil.label_statut}`.trim()
              : avsecKpi?.valeur_realisee ?? null,
          target: avsecKpi?.cible_2027 ?? "Centre AVSEC",
        }}
        extrantStats={extrantStats ?? undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Matrice de suivi des activités
          </h3>
          <ActivityMatrix activities={activityRows} />
        </div>
        <div>
          <AlertPanel alerts={alerts} />
        </div>
      </div>

      <DashboardCharts budgetData={budgetChartData} statutData={statutChartData} />
    </div>
  );
};

const DashboardPage = () => (
  <RequirePermission module={MODULES.DASHBOARD}>
    <Dashboard />
  </RequirePermission>
);

export default DashboardPage;
