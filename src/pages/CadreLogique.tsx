import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { Loader2 } from "lucide-react";
import KpiCards from "@/components/cadre-logique/KpiCards";
import TriennalTable from "@/components/cadre-logique/TriennalTable";
import ActivitiesSummary from "@/components/cadre-logique/ActivitiesSummary";

const CadreLogique = () => {
  const isAdmin = useIsAdmin();

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
      <KpiCards kpis={kpis} isAdmin={isAdmin} onUpdate={() => refetch()} />
      <TriennalTable kpis={kpis} />
      <ActivitiesSummary />
    </div>
  );
};

export default CadreLogique;
