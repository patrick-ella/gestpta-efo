import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSousTacheBudgetLines, useNomenclature, useAddBudgetLines, useUpdateBudgetLine, useDeleteBudgetLine } from "@/hooks/useBudgetLines";
import type { SousTacheLigneBudgetaire } from "@/hooks/useBudgetLines";
import BudgetLineSelector from "./BudgetLineSelector";
import BudgetControlBanner from "./BudgetControlBanner";
import type { PtaActivite } from "@/hooks/usePtaData";

interface Props {
  sousTacheId: string;
  exerciceId: string;
  budgetPrevu: number;
  canEdit: boolean;
  tacheId?: string;
  activites?: PtaActivite[];
}

function formatFCFA(val: number): string {
  return val.toLocaleString("fr-FR") + " FCFA";
}

function getTauxEngColor(taux: number): string {
  if (!taux || taux === 0) return "#9CA3AF";
  if (taux < 50) return "#EF4444";
  if (taux < 75) return "#F59E0B";
  if (taux < 100) return "#3B82F6";
  if (taux === 100) return "#1D4ED8";
  return "#991B1B";
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
  const totalEngage = useMemo(() => lines.reduce((s, l) => s + (l.montant_engage ?? 0), 0), [lines]);
  const totalExecute = useMemo(() => lines.reduce((s, l) => s + l.montant_execute, 0), [lines]);

  const tauxEngTotal = totalPrevu > 0 ? Math.round((totalEngage / totalPrevu) * 1000) / 10 : 0;
  const tauxRealTotal = totalPrevu > 0 ? Math.round((totalExecute / totalPrevu) * 1000) / 10 : 0;

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

  const debouncedUpdate = useCallback((id: string, field: "montant_prevu" | "montant_execute" | "montant_engage", value: number) => {
    const key = `${id}-${field}`;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      updateMutation.mutate({ id, [field]: Math.max(0, value) });
      delete debounceTimers.current[key];
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

      {tacheId && (
        <BudgetControlBanner
          tacheId={tacheId}
          sousTacheId={sousTacheId}
          exerciceId={exerciceId}
          currentStTotal={totalPrevu}
          currentStEngage={totalEngage}
          currentStRealise={totalExecute}
          activites={activites}
        />
      )}

      {lines.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">💰</p>
          <p className="text-sm text-muted-foreground">Aucune ligne budgétaire attribuée</p>
          <p className="text-xs text-muted-foreground">Cliquez sur « + Ajouter une ligne budgétaire »</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => {
            const lineTauxReal = line.montant_prevu > 0 ? Math.round((line.montant_execute / line.montant_prevu) * 1000) / 10 : 0;
            const lineTauxEng = line.montant_prevu > 0 ? Math.round(((line.montant_engage ?? 0) / line.montant_prevu) * 1000) / 10 : 0;
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
                {/* 4-column grid: Prévu | Engagé | Réalisé | Taux */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Prévu */}
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
                  {/* Engagé */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Montant engagé</label>
                    {canEdit ? (
                      <Input
                        type="number"
                        defaultValue={line.montant_engage ?? 0}
                        min={0}
                        onChange={(e) => debouncedUpdate(line.id, "montant_engage", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <p className="text-sm font-medium" style={{ color: getTauxEngColor(lineTauxEng) }}>{formatFCFA(line.montant_engage ?? 0)}</p>
                    )}
                  </div>
                  {/* Réalisé */}
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
                  {/* Taux */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Taux</label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground w-8">Eng.</span>
                        <Progress value={Math.min(lineTauxEng, 100)} className="flex-1 h-1.5 [&>div]:bg-[#3B82F6]" />
                        <span className="text-xs font-medium" style={{ color: getTauxEngColor(lineTauxEng) }}>{lineTauxEng}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground w-8">Réal.</span>
                        <Progress value={Math.min(lineTauxReal, 100)} className="flex-1 h-1.5 [&>div]:bg-[#22C55E]" />
                        <span className="text-xs font-medium">{lineTauxReal}%</span>
                        {overExec && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Totals row */}
          <div className="rounded-lg border-2 border-primary/20 p-3 bg-primary/5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-semibold">
              <div>
                <p className="text-[10px] text-muted-foreground">TOTAL PRÉVU</p>
                <p>{formatFCFA(totalPrevu)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">TOTAL ENGAGÉ</p>
                <p style={{ color: getTauxEngColor(tauxEngTotal) }}>{formatFCFA(totalEngage)}</p>
                <p className="text-[10px] font-medium" style={{ color: getTauxEngColor(tauxEngTotal) }}>{tauxEngTotal}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">TOTAL EXÉCUTÉ</p>
                <p>{formatFCFA(totalExecute)}</p>
                <p className="text-[10px] font-medium">{tauxRealTotal}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">TAUX GLOBAUX</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🔵</span>
                  <span className="text-xs" style={{ color: getTauxEngColor(tauxEngTotal) }}>{tauxEngTotal}%</span>
                  <span className="text-[10px]">🟢</span>
                  <span className="text-xs">{tauxRealTotal}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
