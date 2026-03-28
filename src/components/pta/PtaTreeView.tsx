import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy, Loader2, Package, CheckCircle2, AlertTriangle, Lock, Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import InlineEditActivite from "@/components/pta/InlineEditActivite";
import InlineEditTache from "@/components/pta/InlineEditTache";
import InlineAddTache from "@/components/pta/InlineAddTache";
import CreateSousTachePanel from "@/components/pta/CreateSousTachePanel";
import { DeleteConfirmDialog } from "@/components/pta/DeleteConfirmDialog";
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
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingTacheId, setEditingTacheId] = useState<string | null>(null);
  const [addingTacheForAct, setAddingTacheForAct] = useState<string | null>(null);
  const [createStForTache, setCreateStForTache] = useState<{ tache: PtaTache; act: PtaActivite } | null>(null);
  const [deleteTache, setDeleteTache] = useState<{ tache: PtaTache; act: PtaActivite } | null>(null);
  const [deleteSt, setDeleteSt] = useState<{ st: SousTache; tache: PtaTache } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: livrableCounts = {} } = useQuery({
    queryKey: ["livrables-counts-by-st"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livrables").select("sous_tache_id, statut").not("sous_tache_id", "is", null);
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

  const toggleAct = (id: string) => setExpandedActs((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleTache = (id: string) => setExpandedTaches((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleDuplicate = async (act: PtaActivite) => {
    setDuplicating(act.id);
    try {
      const { data: currentEx } = await supabase.from("exercices").select("annee").eq("id", act.exercice_id).single();
      if (!currentEx) throw new Error("Exercice introuvable");
      const nextYear = currentEx.annee + 1;
      let { data: nextEx } = await supabase.from("exercices").select("id").eq("annee", nextYear).maybeSingle();
      if (!nextEx) {
        const { data: created, error } = await supabase.from("exercices").insert({ annee: nextYear, statut: "brouillon" }).select("id").single();
        if (error) throw error;
        nextEx = created;
      }
      const { data: newAct, error: actErr } = await supabase.from("activites").insert({ exercice_id: nextEx!.id, code: act.code + "_" + nextYear, libelle: act.libelle, objectif_operationnel: act.objectif_operationnel, budget_total: act.budget_total, ordre: act.ordre }).select("id").single();
      if (actErr) throw actErr;
      for (const tache of act.taches) {
        const { data: newTache, error: tErr } = await supabase.from("taches").insert({ activite_id: newAct!.id, code: tache.code + "_" + nextYear, libelle: tache.libelle, livrables: tache.livrables, budget_total: tache.budget_total, ordre: tache.ordre }).select("id").single();
        if (tErr) throw tErr;
        if (tache.sous_taches.length > 0) {
          const stInserts = tache.sous_taches.map((st) => ({ tache_id: newTache!.id, code: st.code + "_" + nextYear, libelle: st.libelle, budget_prevu: st.budget_prevu, lignes_budgetaires: st.lignes_budgetaires, mode_execution: st.mode_execution, sources_financement: st.sources_financement, responsable: st.responsable, ressources_humaines: st.ressources_humaines, risques: st.risques, mesures_attenuation: st.mesures_attenuation, trimestre_t1: false, trimestre_t2: false, trimestre_t3: false, trimestre_t4: false, ordre: st.ordre }));
          await supabase.from("sous_taches").insert(stInserts);
        }
      }
      toast({ title: "Succès", description: `Activité ${act.code} dupliquée vers l'exercice ${nextYear}.` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur de duplication", description: err.message, variant: "destructive" });
    } finally { setDuplicating(null); }
  };

  const isRecentlyEdited = (updatedAt: string | null | undefined) => {
    if (!updatedAt) return false;
    return Date.now() - new Date(updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  };

  const checkExecutionBlock = async (stIds: string[]): Promise<string | null> => {
    if (stIds.length === 0) return null;
    const { data } = await supabase.from("executions").select("id, montant_realise, avancement_pct").in("sous_tache_id", stIds);
    const hasData = (data ?? []).some((e) => (e.montant_realise ?? 0) > 0 || (e.avancement_pct ?? 0) > 0);
    return hasData ? "Des données d'exécution existent. Réinitialisez l'exécution avant de supprimer." : null;
  };

  const handleDeleteTacheClick = async (tache: PtaTache, act: PtaActivite) => {
    const stIds = tache.sous_taches.map((st) => st.id);
    const blocked = await checkExecutionBlock(stIds);
    setDeleteBlocked(blocked);
    setDeleteTache({ tache, act });
  };

  const handleDeleteTacheConfirm = async () => {
    if (!deleteTache || !user) return;
    const { tache } = deleteTache;
    const stIds = tache.sous_taches.map((st) => st.id);
    try {
      if (stIds.length > 0) {
        await supabase.from("livrables").delete().in("sous_tache_id", stIds);
        await supabase.from("executions").delete().in("sous_tache_id", stIds);
        await supabase.from("sous_taches").delete().eq("tache_id", tache.id);
      }
      await supabase.from("taches").delete().eq("id", tache.id);
      await supabase.from("journal_audit").insert({
        user_id: user.id, action: "DELETE", entite: "tache",
        ancienne_valeur: { code: tache.code, libelle: tache.libelle, nb_sous_taches: tache.sous_taches.length } as any,
      });
      toast({ title: `🗑 Tâche ${tache.code} supprimée` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteStClick = async (st: SousTache, tache: PtaTache) => {
    const blocked = await checkExecutionBlock([st.id]);
    setDeleteBlocked(blocked);
    setDeleteSt({ st, tache });
  };

  const handleDeleteStConfirm = async () => {
    if (!deleteSt || !user) return;
    const { st, tache } = deleteSt;
    try {
      await supabase.from("livrables").delete().eq("sous_tache_id", st.id);
      await supabase.from("executions").delete().eq("sous_tache_id", st.id);
      await supabase.from("sous_taches").delete().eq("id", st.id);
      await supabase.from("journal_audit").insert({
        user_id: user.id, action: "DELETE", entite: "sous_tache",
        ancienne_valeur: { code: st.code, libelle: st.libelle, budget_prevu: st.budget_prevu, tache_code: tache.code } as any,
      });
      toast({ title: `🗑 Sous-tâche ${st.code} supprimée` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const getTacheDeleteWarnings = (tache: PtaTache) => {
    const stCount = tache.sous_taches.length;
    const livCount = tache.sous_taches.reduce((s, st) => s + (livrableCounts[st.id]?.total ?? 0), 0);
    const warnings = [];
    if (stCount > 0) warnings.push(`${stCount} sous-tâche(s) liée(s)`);
    if (livCount > 0) warnings.push(`${livCount} livrable(s) enregistré(s)`);
    warnings.push("Le budget de l'activité parente sera recalculé automatiquement");
    return warnings;
  };

  const getStDeleteWarnings = (st: SousTache) => {
    const livCount = livrableCounts[st.id]?.total ?? 0;
    const warnings = [];
    if (livCount > 0) warnings.push(`${livCount} livrable(s) enregistré(s)`);
    warnings.push("Le budget de la tâche parente sera recalculé automatiquement");
    return warnings;
  };

  return (
    <div className="space-y-2">
      {activites.map((act) => {
        const actExpanded = expandedActs.has(act.id);
        const totalSt = act.taches.reduce((s, t) => s + t.sous_taches.length, 0);
        const isEditingAct = editingActId === act.id;

        return (
          <div key={act.id} className="rounded-lg border overflow-hidden">
            {/* Activity row */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground cursor-pointer select-none group"
              onClick={() => !isEditingAct && toggleAct(act.id)}
              onDoubleClick={() => isAdmin && !isEditingAct && setEditingActId(act.id)}>
              <div className="flex items-center gap-3 min-w-0">
                {actExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <Badge variant="outline" className="border-primary-foreground/40 text-primary-foreground text-xs shrink-0">{act.code}</Badge>
                {isRecentlyEdited((act as any).updated_at) && (
                  <Tooltip><TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" /></TooltipTrigger>
                    <TooltipContent>Modifié récemment</TooltipContent></Tooltip>
                )}
                <span className="font-semibold text-sm truncate">{act.libelle}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs opacity-80">{act.taches.length} tâches · {totalSt} sous-tâches</span>
                <Tooltip><TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-xs font-semibold"><Lock className="h-3 w-3 opacity-60" />{formatBudget(act.budget_total)} FCFA</span>
                </TooltipTrigger><TooltipContent>Budget calculé automatiquement (somme des tâches)</TooltipContent></Tooltip>
                {isAdmin && (
                  <>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-foreground/10"
                        onClick={(e) => { e.stopPropagation(); setEditingActId(act.id); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger><TooltipContent>Modifier le libellé</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(act); }} disabled={duplicating === act.id}>
                        {duplicating === act.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger><TooltipContent>Dupliquer vers exercice N+1</TooltipContent></Tooltip>
                  </>
                )}
              </div>
            </div>

            {isEditingAct && (
              <InlineEditActivite id={act.id} code={act.code} libelle={act.libelle} objectifOperationnel={act.objectif_operationnel}
                onSaved={() => { setEditingActId(null); onRefresh(); }} onCancel={() => setEditingActId(null)} />
            )}

            {/* Taches */}
            {actExpanded && act.taches.map((tache) => {
              const tacheExpanded = expandedTaches.has(tache.id);
              const isEditingTache = editingTacheId === tache.id;

              return (
                <div key={tache.id}>
                  <div className="flex items-center justify-between px-6 py-2.5 bg-secondary text-secondary-foreground cursor-pointer select-none border-t border-secondary/50 group/tache"
                    onClick={() => !isEditingTache && toggleTache(tache.id)}
                    onDoubleClick={() => isAdmin && !isEditingTache && setEditingTacheId(tache.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      {tacheExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <Badge variant="outline" className="border-secondary-foreground/40 text-secondary-foreground text-xs shrink-0">{tache.code}</Badge>
                      {isRecentlyEdited((tache as any).updated_at) && (
                        <Tooltip><TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" /></TooltipTrigger>
                          <TooltipContent>Modifié récemment</TooltipContent></Tooltip>
                      )}
                      <span className="text-sm truncate">{tache.libelle}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isAdmin && (
                        <>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-secondary-foreground opacity-0 group-hover/tache:opacity-100 transition-opacity hover:bg-secondary-foreground/10"
                              onClick={(e) => { e.stopPropagation(); setEditingTacheId(tache.id); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Modifier le libellé</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive opacity-0 group-hover/tache:opacity-100 transition-opacity hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTacheClick(tache, act); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Supprimer cette tâche</TooltipContent></Tooltip>
                        </>
                      )}
                      <span className="text-xs opacity-80">{tache.sous_taches.length} sous-tâches</span>
                      {(() => {
                        const stSum = tache.sous_taches.reduce((s, st) => s + (st.budget_prevu ?? 0), 0);
                        const match = stSum === (tache.budget_total ?? 0);
                        return (
                          <Tooltip><TooltipTrigger asChild>
                            <span className="flex items-center gap-1 text-xs font-semibold">
                              <Lock className="h-3 w-3 opacity-60" />{formatBudget(tache.budget_total)} FCFA
                              {match ? <CheckCircle2 className="h-3 w-3 text-green-300" /> : <AlertTriangle className="h-3 w-3 text-amber-300" />}
                            </span>
                          </TooltipTrigger><TooltipContent>
                            {match ? "Budget = somme des sous-tâches ✅" : `Écart: tâche ${(tache.budget_total ?? 0).toLocaleString("fr-FR")} vs sous-tâches ${stSum.toLocaleString("fr-FR")} FCFA`}
                          </TooltipContent></Tooltip>
                        );
                      })()}
                    </div>
                  </div>

                  {isEditingTache && (
                    <InlineEditTache id={tache.id} code={tache.code} libelle={tache.libelle} livrables={tache.livrables}
                      onSaved={() => { setEditingTacheId(null); onRefresh(); }} onCancel={() => setEditingTacheId(null)} />
                  )}

                  {/* Sub-tasks */}
                  {tacheExpanded && tache.sous_taches.map((st, idx) => (
                    <div key={st.id}
                      className={`flex items-center justify-between px-10 py-2 cursor-pointer hover:bg-accent/50 border-t transition-colors group/st ${idx % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row"}`}
                      onClick={() => onSelectSousTache(st)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{st.code}</span>
                        {isRecentlyEdited((st as any).updated_at) && (
                          <Tooltip><TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" /></TooltipTrigger>
                            <TooltipContent>Modifié récemment</TooltipContent></Tooltip>
                        )}
                        <span className="text-sm text-foreground truncate">{st.libelle}</span>
                        {livrableCounts[st.id] && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            livrableCounts[st.id].done === livrableCounts[st.id].total ? "bg-green-100 text-green-800"
                            : livrableCounts[st.id].done > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
                          }`}><Package className="h-3 w-3" />{livrableCounts[st.id].done}/{livrableCounts[st.id].total}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {isAdmin && (
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive opacity-0 group-hover/st:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); handleDeleteStClick(st, tache); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Supprimer cette sous-tâche</TooltipContent></Tooltip>
                        )}
                        <div className="flex gap-1">
                          {(["trimestre_t1", "trimestre_t2", "trimestre_t3", "trimestre_t4"] as const).map((tKey, ti) => (
                            <span key={tKey} className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${
                              st[tKey] ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                            }`}>T{ti + 1}</span>
                          ))}
                        </div>
                        {st.budget_prevu ? <span className="text-xs text-muted-foreground">{formatBudget(st.budget_prevu)}</span> : null}
                      </div>
                    </div>
                  ))}

                  {/* Add sous-tâche button */}
                  {tacheExpanded && isAdmin && (
                    <div className="border-t border-dashed border-muted px-10 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setCreateStForTache({ tache, act }); }}>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Ajouter une sous-tâche à {tache.code}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add tâche button */}
            {actExpanded && isAdmin && (
              addingTacheForAct === act.id ? (
                <InlineAddTache activiteId={act.id} activiteCode={act.code}
                  onCreated={() => { setAddingTacheForAct(null); onRefresh(); }}
                  onCancel={() => setAddingTacheForAct(null)} />
              ) : (
                <div className="border-t border-dashed border-secondary px-6 py-2.5 cursor-pointer hover:bg-secondary/10 transition-colors"
                  onClick={() => setAddingTacheForAct(act.id)}>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Ajouter une tâche à l'activité {act.code}
                  </span>
                </div>
              )
            )}
          </div>
        );
      })}

      {/* Create sous-tâche panel */}
      {createStForTache && (
        <CreateSousTachePanel open={!!createStForTache}
          onClose={() => setCreateStForTache(null)}
          tacheId={createStForTache.tache.id}
          tacheCode={createStForTache.tache.code}
          tacheLibelle={createStForTache.tache.libelle}
          actCode={createStForTache.act.code}
          actLibelle={createStForTache.act.libelle}
          onCreated={onRefresh} />
      )}

      {/* Delete tâche dialog */}
      {deleteTache && (
        <DeleteConfirmDialog open={!!deleteTache} onOpenChange={(v) => { if (!v) setDeleteTache(null); }}
          title="Supprimer la tâche" code={deleteTache.tache.code} libelle={deleteTache.tache.libelle}
          warnings={getTacheDeleteWarnings(deleteTache.tache)}
          blocked={deleteBlocked} onConfirm={handleDeleteTacheConfirm} />
      )}

      {/* Delete sous-tâche dialog */}
      {deleteSt && (
        <DeleteConfirmDialog open={!!deleteSt} onOpenChange={(v) => { if (!v) setDeleteSt(null); }}
          title="Supprimer la sous-tâche" code={deleteSt.st.code} libelle={deleteSt.st.libelle}
          budget={deleteSt.st.budget_prevu ?? undefined}
          warnings={getStDeleteWarnings(deleteSt.st)}
          blocked={deleteBlocked} onConfirm={handleDeleteStConfirm} />
      )}
    </div>
  );
};

export default PtaTreeView;
