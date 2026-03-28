import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy, Loader2, Package, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PtaActivite, PtaTache } from "@/hooks/usePtaData";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

interface PtaTreeViewProps {
  activites: PtaActivite[];
  isAdmin: boolean;
  onSelectSousTache: (st: SousTache) => void;
  onRefresh: () => void;
}

function formatBudget(val: number | null): string {
  if (!val) return "—";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString("fr-FR");
}

const PtaTreeView = ({ activites, isAdmin, onSelectSousTache, onRefresh }: PtaTreeViewProps) => {
  const { user } = useAuth();
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedTaches, setExpandedTaches] = useState<Set<string>>(new Set());
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch livrable counts per sous_tache
  const { data: livrableCounts = {} } = useQuery({
    queryKey: ["livrables-counts-by-st"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livrables")
        .select("sous_tache_id, statut")
        .not("sous_tache_id", "is", null);
      if (error) throw error;
      const counts: Record<string, { total: number; done: number }> = {};
      for (const row of data ?? []) {
        const stId = row.sous_tache_id as string;
        if (!counts[stId]) counts[stId] = { total: 0, done: 0 };
        counts[stId].total++;
        if (row.statut === "produit" || row.statut === "valide") counts[stId].done++;
      }
      return counts;
    },
    enabled: !!user,
  });

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

  const handleDuplicate = async (act: PtaActivite) => {
    setDuplicating(act.id);
    try {
      // Find or create next year exercice
      const { data: currentEx } = await supabase
        .from("exercices")
        .select("annee")
        .eq("id", act.exercice_id)
        .single();

      if (!currentEx) throw new Error("Exercice introuvable");
      const nextYear = currentEx.annee + 1;

      let { data: nextEx } = await supabase
        .from("exercices")
        .select("id")
        .eq("annee", nextYear)
        .maybeSingle();

      if (!nextEx) {
        const { data: created, error } = await supabase
          .from("exercices")
          .insert({ annee: nextYear, statut: "brouillon" })
          .select("id")
          .single();
        if (error) throw error;
        nextEx = created;
      }

      // Duplicate activity
      const newCode = act.code + "_" + nextYear;
      const { data: newAct, error: actErr } = await supabase
        .from("activites")
        .insert({
          exercice_id: nextEx!.id,
          code: newCode,
          libelle: act.libelle,
          objectif_operationnel: act.objectif_operationnel,
          budget_total: act.budget_total,
          ordre: act.ordre,
        })
        .select("id")
        .single();
      if (actErr) throw actErr;

      // Duplicate tasks and sub-tasks
      for (const tache of act.taches) {
        const tacheCode = tache.code + "_" + nextYear;
        const { data: newTache, error: tErr } = await supabase
          .from("taches")
          .insert({
            activite_id: newAct!.id,
            code: tacheCode,
            libelle: tache.libelle,
            livrables: tache.livrables,
            budget_total: tache.budget_total,
            ordre: tache.ordre,
          })
          .select("id")
          .single();
        if (tErr) throw tErr;

        if (tache.sous_taches.length > 0) {
          const stInserts = tache.sous_taches.map((st) => ({
            tache_id: newTache!.id,
            code: st.code + "_" + nextYear,
            libelle: st.libelle,
            budget_prevu: st.budget_prevu,
            lignes_budgetaires: st.lignes_budgetaires,
            mode_execution: st.mode_execution,
            sources_financement: st.sources_financement,
            responsable: st.responsable,
            ressources_humaines: st.ressources_humaines,
            risques: st.risques,
            mesures_attenuation: st.mesures_attenuation,
            trimestre_t1: false,
            trimestre_t2: false,
            trimestre_t3: false,
            trimestre_t4: false,
            ordre: st.ordre,
          }));
          const { error: stErr } = await supabase.from("sous_taches").insert(stInserts);
          if (stErr) throw stErr;
        }
      }

      toast({ title: "Succès", description: `Activité ${act.code} dupliquée vers l'exercice ${nextYear}.` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur de duplication", description: err.message, variant: "destructive" });
    } finally {
      setDuplicating(null);
    }
  };

  return (
    <div className="space-y-2">
      {activites.map((act) => {
        const actExpanded = expandedActs.has(act.id);
        const totalSt = act.taches.reduce((s, t) => s + t.sous_taches.length, 0);

        return (
          <div key={act.id} className="rounded-lg border overflow-hidden">
            {/* Activity row — Navy */}
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
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs opacity-80">
                  {act.taches.length} tâches · {totalSt} sous-tâches
                </span>
                <span className="text-xs font-semibold">{formatBudget(act.budget_total)} FCFA</span>
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(act); }}
                        disabled={duplicating === act.id}
                      >
                        {duplicating === act.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dupliquer vers exercice N+1</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Taches */}
            {actExpanded && act.taches.map((tache) => {
              const tacheExpanded = expandedTaches.has(tache.id);

              return (
                <div key={tache.id}>
                  {/* Task row — Medium blue */}
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
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs opacity-80">{tache.sous_taches.length} sous-tâches</span>
                      <span className="text-xs font-semibold">{formatBudget(tache.budget_total)} FCFA</span>
                    </div>
                  </div>

                  {/* Sub-tasks — Light blue alternating */}
                  {tacheExpanded && tache.sous_taches.map((st, idx) => (
                    <div
                      key={st.id}
                      className={`flex items-center justify-between px-10 py-2 cursor-pointer hover:bg-accent/50 border-t transition-colors ${
                        idx % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row"
                      }`}
                      onClick={() => onSelectSousTache(st)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{st.code}</span>
                        <span className="text-sm text-foreground truncate">{st.libelle}</span>
                        {livrableCounts[st.id] && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            livrableCounts[st.id].done === livrableCounts[st.id].total
                              ? "bg-green-100 text-green-800"
                              : livrableCounts[st.id].done > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <Package className="h-3 w-3" />
                            {livrableCounts[st.id].done}/{livrableCounts[st.id].total}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex gap-1">
                          {(["trimestre_t1", "trimestre_t2", "trimestre_t3", "trimestre_t4"] as const).map((tKey, ti) => (
                            <span
                              key={tKey}
                              className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${
                                st[tKey] ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              T{ti + 1}
                            </span>
                          ))}
                        </div>
                        {st.budget_prevu ? (
                          <span className="text-xs text-muted-foreground">{formatBudget(st.budget_prevu)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default PtaTreeView;
