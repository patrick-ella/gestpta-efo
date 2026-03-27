import { useState, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { PtaActivite, PtaTache } from "@/hooks/usePtaData";
import type { ExecutionMap } from "@/hooks/useExecutionData";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

export interface PendingChange {
  avancement_pct: number;
  montant_realise: number;
  statut: string;
  observations: string;
}

interface Props {
  activites: PtaActivite[];
  executionMap: ExecutionMap;
  pendingChanges: Record<string, PendingChange>;
  onChangePending: (stId: string, change: Partial<PendingChange>) => void;
  onSaveSingle: (stId: string) => void;
  onSelectSousTache: (st: SousTache, tache: PtaTache, act: PtaActivite) => void;
  canEditSt: (st: SousTache) => boolean;
}

function formatBudget(val: number | null): string {
  if (!val) return "—";
  return val.toLocaleString("fr-FR");
}

const statutLabels: Record<string, string> = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  termine: "Terminé",
  suspendu: "Suspendu",
  annule: "Annulé",
};

const statutColors: Record<string, string> = {
  non_demarre: "bg-muted text-muted-foreground",
  en_cours: "bg-secondary/20 text-secondary",
  termine: "bg-success text-success-foreground",
  suspendu: "bg-warning text-warning-foreground",
  annule: "bg-destructive/10 text-destructive",
};

function pctColor(pct: number): string {
  if (pct === 0) return "bg-muted text-muted-foreground";
  if (pct < 50) return "bg-warning text-warning-foreground";
  if (pct < 75) return "bg-warning/60 text-warning-foreground";
  if (pct < 100) return "bg-success/70 text-success-foreground";
  return "bg-success text-success-foreground";
}

function computeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

const ExecutionTreeView = ({
  activites,
  executionMap,
  pendingChanges,
  onChangePending,
  onSaveSingle,
  onSelectSousTache,
  canEditSt,
}: Props) => {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedTaches, setExpandedTaches] = useState<Set<string>>(new Set());
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toggleAct = (id: string) => {
    setExpandedActs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTache = (id: string) => {
    setExpandedTaches((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleChange = useCallback(
    (stId: string, change: Partial<PendingChange>) => {
      onChangePending(stId, change);
      // Auto-save after 3s
      if (autoSaveTimers.current[stId]) clearTimeout(autoSaveTimers.current[stId]);
      autoSaveTimers.current[stId] = setTimeout(() => {
        onSaveSingle(stId);
        delete autoSaveTimers.current[stId];
      }, 3000);
    },
    [onChangePending, onSaveSingle]
  );

  return (
    <div className="space-y-2">
      {activites.map((act) => {
        const actExpanded = expandedActs.has(act.id);
        // Compute activity-level progress
        const stPcts: number[] = [];
        let budgetConsumed = 0;
        act.taches.forEach((t) =>
          t.sous_taches.forEach((st) => {
            const p = pendingChanges[st.id];
            const ex = executionMap[st.id];
            stPcts.push(p?.avancement_pct ?? ex?.avancement_pct ?? 0);
            budgetConsumed += p?.montant_realise ?? ex?.montant_realise ?? 0;
          })
        );
        const actPct = computeAvg(stPcts);
        const actStatut = actPct === 100 ? "termine" : actPct > 0 ? "en_cours" : "non_demarre";

        return (
          <div key={act.id} className="rounded-lg border overflow-hidden">
            {/* Activity header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground cursor-pointer select-none"
              onClick={() => toggleAct(act.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {actExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <Badge variant="outline" className="border-primary-foreground/40 text-primary-foreground text-xs shrink-0">
                  {act.code}
                </Badge>
                <span className="font-semibold text-sm truncate">{act.libelle}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span>Budget : {formatBudget(act.budget_total)}</span>
                <span>Consommé : {formatBudget(budgetConsumed)}</span>
                <Badge className={pctColor(actPct)}>{actPct}%</Badge>
                <Badge className={statutColors[actStatut]}>{statutLabels[actStatut]}</Badge>
              </div>
            </div>

            {actExpanded &&
              act.taches.map((tache) => {
                const tacheExpanded = expandedTaches.has(tache.id);
                const tachePcts = tache.sous_taches.map((st) => {
                  const p = pendingChanges[st.id];
                  const ex = executionMap[st.id];
                  return p?.avancement_pct ?? ex?.avancement_pct ?? 0;
                });
                const tachePct = computeAvg(tachePcts);
                let tacheBudgetConsumed = 0;
                tache.sous_taches.forEach((st) => {
                  const p = pendingChanges[st.id];
                  const ex = executionMap[st.id];
                  tacheBudgetConsumed += p?.montant_realise ?? ex?.montant_realise ?? 0;
                });

                return (
                  <div key={tache.id}>
                    {/* Task header */}
                    <div
                      className="flex items-center justify-between px-6 py-2.5 bg-secondary text-secondary-foreground cursor-pointer select-none border-t border-secondary/50"
                      onClick={() => toggleTache(tache.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {tacheExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <Badge variant="outline" className="border-secondary-foreground/40 text-secondary-foreground text-xs shrink-0">
                          {tache.code}
                        </Badge>
                        <span className="text-sm truncate">{tache.libelle}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span>Budget : {formatBudget(tache.budget_total)}</span>
                        <span>Consommé : {formatBudget(tacheBudgetConsumed)}</span>
                        <Badge className={pctColor(tachePct)}>{tachePct}%</Badge>
                      </div>
                    </div>

                    {/* Sub-task rows */}
                    {tacheExpanded &&
                      tache.sous_taches.map((st, idx) => {
                        const ex = executionMap[st.id];
                        const p = pendingChanges[st.id] ?? {
                          avancement_pct: ex?.avancement_pct ?? 0,
                          montant_realise: ex?.montant_realise ?? 0,
                          statut: ex?.statut ?? "non_demarre",
                          observations: ex?.observations ?? "",
                        };
                        const editable = canEditSt(st);
                        const hasPending = !!pendingChanges[st.id];

                        return (
                          <div
                            key={st.id}
                            className={`border-t transition-colors ${
                              idx % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row"
                            } ${hasPending ? "ring-1 ring-inset ring-secondary/30" : ""}`}
                          >
                            {/* Main row — clickable for detail */}
                            <div
                              className="flex items-center gap-3 px-10 py-2 cursor-pointer hover:bg-accent/30"
                              onClick={() => onSelectSousTache(st, tache, act)}
                            >
                              <span className="text-xs text-muted-foreground font-mono shrink-0 w-24">
                                {st.code}
                              </span>
                              <span className="text-sm text-foreground flex-1 truncate">
                                {st.libelle}
                              </span>
                              <Badge className={pctColor(p.avancement_pct)} variant="outline">
                                {p.avancement_pct}%
                              </Badge>
                              <Badge className={statutColors[p.statut] ?? statutColors.non_demarre} variant="outline">
                                {statutLabels[p.statut] ?? p.statut}
                              </Badge>
                              {hasPending && (
                                <span className="text-[10px] text-secondary font-semibold">modifié</span>
                              )}
                            </div>

                            {/* Inline edit row */}
                            {editable && (
                              <div className="flex flex-wrap items-end gap-3 px-10 pb-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="w-40 space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Avancement</label>
                                  <Slider
                                    value={[p.avancement_pct]}
                                    onValueChange={([v]) => handleChange(st.id, { avancement_pct: v })}
                                    min={0}
                                    max={100}
                                    step={25}
                                    className="w-full"
                                  />
                                </div>
                                <div className="w-36 space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Montant réalisé</label>
                                  <Input
                                    type="number"
                                    value={p.montant_realise || ""}
                                    onChange={(e) => handleChange(st.id, { montant_realise: Number(e.target.value) })}
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="w-32 space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Statut</label>
                                  <Select value={p.statut} onValueChange={(v) => handleChange(st.id, { statut: v })}>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(statutLabels).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1 min-w-[160px] space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Observations</label>
                                  <Textarea
                                    value={p.observations}
                                    onChange={(e) => handleChange(st.id, { observations: e.target.value })}
                                    rows={1}
                                    className="text-xs min-h-[28px] resize-none"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => onSaveSingle(st.id)}
                                  disabled={!hasPending}
                                >
                                  Sauvegarder
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
};

export default ExecutionTreeView;
