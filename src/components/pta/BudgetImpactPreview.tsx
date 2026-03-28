import { useMemo } from "react";
import { ArrowUp, ArrowDown, Equal } from "lucide-react";
import type { PtaActivite } from "@/hooks/usePtaData";

interface Props {
  sousTacheId: string;
  tacheId: string;
  originalBudget: number;
  newBudget: number;
  activites: PtaActivite[];
}

function fmt(v: number) {
  return v.toLocaleString("fr-FR") + " FCFA";
}

function DiffLine({ label, code, before, after }: { label: string; code: string; before: number; after: number }) {
  const diff = after - before;
  if (diff === 0) return null;
  const isUp = diff > 0;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label} [{code}] :</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Avant : {fmt(before)}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold text-foreground">Après : {fmt(after)}</span>
        <span className={`flex items-center gap-0.5 font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}>
          {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {isUp ? "+" : ""}{fmt(diff)}
        </span>
      </div>
    </div>
  );
}

const BudgetImpactPreview = ({ sousTacheId, tacheId, originalBudget, newBudget, activites }: Props) => {
  const diff = newBudget - originalBudget;

  const { tache, activite, totalPtaBefore } = useMemo(() => {
    let tache = { code: "", budget: 0 };
    let activite = { code: "", budget: 0 };
    let totalPta = 0;

    for (const act of activites) {
      totalPta += act.budget_total ?? 0;
      for (const t of act.taches) {
        if (t.id === tacheId) {
          tache = { code: t.code, budget: t.budget_total ?? 0 };
          activite = { code: act.code, budget: act.budget_total ?? 0 };
        }
      }
    }
    return { tache, activite, totalPtaBefore: totalPta };
  }, [activites, tacheId]);

  if (diff === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 mt-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        💰 Impact budgétaire de cette modification
      </div>
      <DiffLine label="Tâche" code={tache.code} before={tache.budget} after={tache.budget + diff} />
      <DiffLine label="Activité" code={activite.code} before={activite.budget} after={activite.budget + diff} />
      <DiffLine label="Total PTA" code="global" before={totalPtaBefore} after={totalPtaBefore + diff} />
    </div>
  );
};

export default BudgetImpactPreview;
