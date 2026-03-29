import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, AlertTriangle, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSousTacheBudgetLines, useNomenclature, useAddBudgetLines, useUpdateBudgetLine, useDeleteBudgetLine } from "@/hooks/useBudgetLines";
import type { SousTacheLigneBudgetaire } from "@/hooks/useBudgetLines";
import BudgetLineSelector from "./BudgetLineSelector";
import BudgetControlBanner from "./BudgetControlBanner";
import type { PtaActivite } from "@/hooks/usePtaData";

interface Props {
  sousTacheId: string;
  exerciceId: string;
  budgetPrevu: number; // tache budget_total (plafond)
  canEdit: boolean;
  tacheId?: string;
  activites?: PtaActivite[];
}

function formatFCFA(val: number): string {
  return val.toLocaleString("fr-FR") + " FCFA";
}

const BudgetLinesTab = ({ sousTacheId, exerciceId, budgetPrevu, canEdit, tacheId, activites = [] }: Props) => {
  const { toast } = useToast();
  const { data: lines = [], isLoading } = useSousTacheBudgetLines(sousTacheId, exerciceId);
  const { data: nomenclature = [] } = useNomenclature();
  const addMutation = useAddBudgetLines();
  const updateMutation = useUpdateBudgetLine();
  const deleteMutation = useDeleteBudgetLine();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const existingCodes = useMemo(() => new Set(lines.map((l) => l.code_ligne)), [lines]);

  const totalPrevu = useMemo(() => lines.reduce((s, l) => s + l.montant_prevu, 0), [lines]);
  const totalExecute = useMemo(() => lines.reduce((s, l) => s + l.montant_execute, 0), [lines]);

  const handleAddLines = useCallback(async (selected: { id: string; code: string; libelle: string }[]) => {
    const payload = selected.map((n) => ({
      sous_tache_id: sousTacheId,
      exercice_id: exerciceId,
      nomenclature_id: n.id,
      code_ligne: n.code,
      libelle_ligne: n.libelle,
    }));
    try {
      await addMutation.mutateAsync(payload);
      toast({ title: `${selected.length} ligne(s) budgétaire(s) ajoutée(s) ✅` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [sousTacheId, exerciceId, addMutation, toast]);

  const debouncedUpdate = useCallback((id: string, field: "montant_prevu" | "montant_execute", value: number) => {
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(() => {
      updateMutation.mutate({ id, [field]: Math.max(0, value) });
      delete debounceTimers.current[id];
    }, 1500);
  }, [updateMutation]);

  const handleDelete = useCallback(async (line: SousTacheLigneBudgetaire) => {
    if (line.montant_execute > 0) {
      toast({
        title: "🚫 Suppression impossible",
        description: `Cette ligne a déjà ${formatFCFA(line.montant_execute)} réalisés. Remettez le montant réalisé à 0 avant de supprimer.`,
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Supprimer la ligne [${line.code_ligne}] ?\nMontant prévu : ${formatFCFA(line.montant_prevu)}\nCette action libèrera ce montant dans le solde disponible de la tâche.`)) return;
    try {
      await deleteMutation.mutateAsync(line.id);
      toast({ title: `🗑 Ligne [${line.code_ligne}] supprimée — Budget sous-tâche mis à jour` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [deleteMutation, toast]);

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground italic">
        Répartissez le budget de la sous-tâche entre les lignes budgétaires officielles
      </div>

      {/* Budget control banner */}
      {tacheId && (
        <BudgetControlBanner
          tacheId={tacheId}
          sousTacheId={sousTacheId}
          exerciceId={exerciceId}
          currentStTotal={totalPrevu}
          activites={activites}
        />
      )}

      {/* Lines list */}
      {lines.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">💰</p>
          <p className="text-sm text-muted-foreground">Aucune ligne budgétaire attribuée</p>
          <p className="text-xs text-muted-foreground">Cliquez sur « + Ajouter une ligne budgétaire »</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => {
            const lineTaux = line.montant_prevu > 0 ? Math.round((line.montant_execute / line.montant_prevu) * 100 * 10) / 10 : 0;
            const overExec = line.montant_execute > line.montant_prevu && line.montant_prevu > 0;
            return (
              <div key={line.id} className={`rounded-lg border p-3 space-y-2 ${overExec ? "border-destructive/50 bg-destructive/5" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-muted-foreground">[{line.code_ligne}]</span>
                    <p className="text-sm font-medium text-foreground leading-tight">{line.libelle_ligne}</p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon"
                      className={`h-7 w-7 ${line.montant_execute > 0 ? "text-muted-foreground opacity-50" : "text-destructive hover:text-destructive"}`}
                      onClick={() => handleDelete(line)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Montant prévu</label>
                    {canEdit ? (
                      <Input
                        type="number"
                        defaultValue={line.montant_prevu}
                        min={0}
                        onChange={(e) => debouncedUpdate(line.id, "montant_prevu", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatFCFA(line.montant_prevu)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Montant exécuté</label>
                    {canEdit ? (
                      <Input
                        type="number"
                        defaultValue={line.montant_execute}
                        min={0}
                        onChange={(e) => debouncedUpdate(line.id, "montant_execute", Number(e.target.value))}
                        className={`h-8 text-xs ${overExec ? "border-destructive" : ""}`}
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatFCFA(line.montant_execute)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Taux exec.</label>
                    <div className="flex items-center gap-1.5">
                      <Progress value={Math.min(lineTaux, 100)} className="flex-1 h-2" />
                      <span className="text-xs font-medium">{lineTaux}%</span>
                      {overExec && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Totals row */}
          <div className="rounded-lg border-2 border-primary/20 p-3 bg-primary/5">
            <div className="grid grid-cols-3 gap-3 text-sm font-semibold">
              <div>
                <p className="text-[10px] text-muted-foreground">TOTAL PRÉVU</p>
                <p>{formatFCFA(totalPrevu)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">TOTAL EXÉCUTÉ</p>
                <p>{formatFCFA(totalExecute)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">TAUX GLOBAL</p>
                <p>{totalPrevu > 0 ? Math.round((totalExecute / totalPrevu) * 1000) / 10 : 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {canEdit && (
        <Button variant="outline" className="w-full border-dashed" onClick={() => setSelectorOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne budgétaire
        </Button>
      )}

      <BudgetLineSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        nomenclature={nomenclature}
        existingCodes={existingCodes}
        onConfirm={handleAddLines}
      />
    </div>
  );
};

export default BudgetLinesTab;
