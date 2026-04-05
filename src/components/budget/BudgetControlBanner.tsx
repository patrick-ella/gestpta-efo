import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { PtaActivite } from "@/hooks/usePtaData";

interface Props {
  tacheId: string;
  sousTacheId: string;
  exerciceId: string;
  currentStTotal: number;
  currentStEngage?: number;
  currentStRealise?: number;
  activites: PtaActivite[];
}

function fmt(v: number) {
  return v.toLocaleString("fr-FR") + " FCFA";
}

const BudgetControlBanner = ({ tacheId, sousTacheId, exerciceId, currentStTotal, currentStEngage = 0, currentStRealise = 0, activites }: Props) => {
  const tacheBudget = useMemo(() => {
    for (const act of (activites ?? [])) {
      for (const t of (act.taches ?? [])) {
        if (t.id === tacheId) return t.budget_total ?? 0;
      }
    }
    return 0;
  }, [activites, tacheId]);

  const tacheCode = useMemo(() => {
    for (const act of (activites ?? [])) {
      for (const t of (act.taches ?? [])) {
        if (t.id === tacheId) return t.code;
      }
    }
    return "";
  }, [activites, tacheId]);

  const { data: otherStTotal = 0 } = useQuery({
    queryKey: ["other-st-budget", tacheId, sousTacheId, exerciceId],
    queryFn: async () => {
      const { data: sts } = await supabase
        .from("sous_taches")
        .select("id")
        .eq("tache_id", tacheId)
        .neq("id", sousTacheId);
      if (!sts || sts.length === 0) return 0;
      const stIds = sts.map((s) => s.id);
      const { data: lines } = await supabase
        .from("sous_tache_lignes_budgetaires")
        .select("montant_prevu")
        .in("sous_tache_id", stIds)
        .eq("exercice_id", exerciceId);
      return (lines ?? []).reduce((s, l) => s + (l.montant_prevu ?? 0), 0);
    },
    enabled: !!tacheId && !!exerciceId,
  });

  const totalVentile = otherStTotal + currentStTotal;
  const solde = tacheBudget - totalVentile;
  const pct = tacheBudget > 0 ? Math.round((totalVentile / tacheBudget) * 1000) / 10 : 0;

  const tauxEng = currentStTotal > 0 ? Math.round((currentStEngage / currentStTotal) * 1000) / 10 : 0;
  const tauxReal = currentStTotal > 0 ? Math.round((currentStRealise / currentStTotal) * 1000) / 10 : 0;

  const soldeRatio = tacheBudget > 0 ? solde / tacheBudget : 1;
  let bgColor = "bg-green-50 border-green-200 dark:bg-[hsl(140,30%,12%)] dark:border-green-700";
  let statusColor = "text-green-600 dark:text-green-400";
  let statusLabel = "✅";

  if (solde < 0) {
    bgColor = "bg-red-50 border-red-200 dark:bg-[hsl(0,40%,12%)] dark:border-red-700";
    statusColor = "text-destructive dark:text-red-400";
    statusLabel = "⛔";
  } else if (soldeRatio <= 0.1) {
    bgColor = "bg-amber-50 border-amber-200 dark:bg-[hsl(40,40%,12%)] dark:border-amber-700";
    statusColor = "text-amber-600 dark:text-amber-400";
    statusLabel = solde === 0 ? "✓" : "⚠️";
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${bgColor}`}>
      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        📊 Contrôle budgétaire — Tâche [{tacheCode}]
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Plafond tâche</span>
        <span className="font-semibold text-foreground text-right flex items-center justify-end gap-1">
          {fmt(tacheBudget)} <Lock className="h-3 w-3 text-muted-foreground" />
        </span>

        <span className="text-muted-foreground">Déjà ventilé (autres ST)</span>
        <span className="font-medium text-foreground text-right">{fmt(otherStTotal)}</span>

        <span className="text-muted-foreground">Cette sous-tâche</span>
        <span className="font-medium text-foreground text-right">{fmt(currentStTotal)}</span>

        <span className="text-muted-foreground font-semibold">Solde disponible</span>
        <span className={`font-bold text-right flex items-center justify-end gap-1 ${statusColor}`}>
          {fmt(solde)} {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={Math.min(pct, 100)} className="flex-1 h-2" />
        <span className="text-xs font-medium text-muted-foreground">{pct}% ventilé</span>
      </div>

      {/* Taux engagement & réalisation */}
      {currentStTotal > 0 && (
        <div className="space-y-1 pt-1 border-t border-current/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24">🔵 Engagement</span>
            <Progress value={Math.min(tauxEng, 100)} className="flex-1 h-1.5 [&>div]:bg-[#3B82F6]" />
            <span className="text-xs font-medium w-10 text-right" style={{ color: "#3B82F6" }}>{tauxEng}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24">🟢 Réalisation</span>
            <Progress value={Math.min(tauxReal, 100)} className="flex-1 h-1.5 [&>div]:bg-[#22C55E]" />
            <span className="text-xs font-medium w-10 text-right" style={{ color: "#22C55E" }}>{tauxReal}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetControlBanner;
