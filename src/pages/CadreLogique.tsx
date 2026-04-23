import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";
import KpiCards from "@/components/cadre-logique/KpiCards";
import TriennalTable from "@/components/cadre-logique/TriennalTable";
import ActivitiesSummary from "@/components/cadre-logique/ActivitiesSummary";
import RequirePermission from "@/components/auth/RequirePermission";
import { MODULES } from "@/lib/constants/modules";

const CadreLogiqueContent = () => {
  const { can } = usePermissions();
  const canEditKpi = can(MODULES.CADRE_LOGIQUE, "update");

  const { data: kpis = [], isLoading, refetch } = useQuery({
    queryKey: ["indicateurs-kpi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicateurs_kpi")
        .select("*")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement du cadre logique…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Cadre Logique</h1>
      <KpiCards kpis={kpis} isAdmin={canEditKpi} onUpdate={() => refetch()} />
      <TriennalTable kpis={kpis} />
      <ActivitiesSummary />
    </div>
  );
};

const CadreLogique = () => (
  <RequirePermission module={MODULES.CADRE_LOGIQUE}>
    <CadreLogiqueContent />
  </RequirePermission>
);

export default CadreLogique;
