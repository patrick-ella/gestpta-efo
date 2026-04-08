import { useState, useMemo } from "react";
import { usePtaData } from "@/hooks/usePtaData";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PtaTreeView from "@/components/pta/PtaTreeView";
import SousTacheDetailPanel from "@/components/pta/SousTacheDetailPanel";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

const PlanTravail = () => {
  const { data, isLoading, refetch } = usePtaData(2026);
  const isAdmin = useIsAdmin();
  const [selectedSt, setSelectedSt] = useState<SousTache | null>(null);

  useRealtimeSync({ table: "sous_taches", queryKeys: [["pta-data", "2026"]] });
  useRealtimeSync({ table: "taches", queryKeys: [["pta-data", "2026"]] });
  useRealtimeSync({ table: "activites", queryKeys: [["pta-data", "2026"]] });

  // Find tache livrables text for selected sous-tache
  const tacheLivrables = useMemo(() => {
    if (!selectedSt || !data?.activites) return null;
    for (const act of data.activites) {
      for (const t of act.taches) {
        if (t.sous_taches.some((st) => st.id === selectedSt.id)) {
          return t.livrables;
        }
      }
    }
    return null;
  }, [selectedSt, data?.activites]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement du PTA…</span>
      </div>
    );
  }

  const activites = data?.activites ?? [];
  const exercice = data?.exercice;

  const totalBudget = activites.reduce((s, a) => s + (a.budget_total ?? 0), 0);
  const totalTaches = activites.reduce((s, a) => s + a.taches.length, 0);
  const totalSt = activites.reduce(
    (s, a) => s + a.taches.reduce((ts, t) => ts + t.sous_taches.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Plan de Travail Annuel (PTA)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Exercice {exercice?.annee ?? "—"} · Statut :{" "}
            <Badge variant="outline" className="ml-1">
              {exercice?.statut ?? "—"}
            </Badge>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Budget total</p>
          <p className="text-xl font-bold text-foreground">
            {totalBudget.toLocaleString("fr-FR")} FCFA
          </p>
          <p className="text-xs text-muted-foreground">
            {activites.length} activités · {totalTaches} tâches · {totalSt} sous-tâches
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-primary" />
          Activités
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-secondary" />
          Tâches
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-light-blue" />
          Sous-tâches
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-success" />
          Trimestre programmé
        </div>
      </div>

      <PtaTreeView
        activites={activites}
        isAdmin={isAdmin}
        onSelectSousTache={setSelectedSt}
        onRefresh={() => refetch()}
      />

      <SousTacheDetailPanel
        sousTache={selectedSt}
        open={!!selectedSt}
        onClose={() => setSelectedSt(null)}
        isAdmin={isAdmin}
        onUpdate={() => { refetch(); }}
        tacheLivrables={tacheLivrables}
        activites={activites}
        exerciceId={data?.exercice?.id ?? null}
      />
    </div>
  );
};

export default PlanTravail;
