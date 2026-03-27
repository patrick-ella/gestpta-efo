import { useState, useCallback, useMemo } from "react";
import { usePtaData } from "@/hooks/usePtaData";
import { useExecutionData, buildExecutionMap } from "@/hooks/useExecutionData";
import { useIsAdmin, useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExecutionFilterBar, { defaultFilters, type ExecutionFilters } from "@/components/execution/ExecutionFilterBar";
import ExecutionTreeView, { type PendingChange } from "@/components/execution/ExecutionTreeView";
import ExecutionDetailPanel from "@/components/execution/ExecutionDetailPanel";
import type { PtaActivite, PtaTache } from "@/hooks/usePtaData";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

const Execution = () => {
  const { data: ptaData, isLoading: ptaLoading } = usePtaData(2026);
  const exerciceId = ptaData?.exercice?.id ?? null;
  const { data: executions = [], isLoading: exLoading } = useExecutionData(exerciceId);
  const isAdmin = useIsAdmin();
  const { data: roles = [] } = useUserRoles();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ExecutionFilters>(defaultFilters);
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [selectedSt, setSelectedSt] = useState<SousTache | null>(null);
  const [selectedTache, setSelectedTache] = useState<PtaTache | null>(null);
  const [selectedAct, setSelectedAct] = useState<PtaActivite | null>(null);
  const [saving, setSaving] = useState(false);

  const executionMap = useMemo(() => buildExecutionMap(executions), [executions]);

  // Filter activites
  const filteredActivites = useMemo(() => {
    let acts = ptaData?.activites ?? [];
    if (filters.activiteId) {
      acts = acts.filter((a) => a.id === filters.activiteId);
    }
    // Apply sub-filters by filtering sub-tasks within
    return acts
      .map((act) => ({
        ...act,
        taches: act.taches
          .map((t) => ({
            ...t,
            sous_taches: t.sous_taches.filter((st) => {
              if (filters.responsable && st.responsable !== filters.responsable) return false;
              if (filters.statut) {
                const ex = executionMap[st.id];
                const p = pendingChanges[st.id];
                const statut = p?.statut ?? ex?.statut ?? "non_demarre";
                if (statut !== filters.statut) return false;
              }
              if (filters.trimestre) {
                const key = `trimestre_${filters.trimestre}` as keyof SousTache;
                if (!st[key]) return false;
              }
              if (filters.search) {
                const q = filters.search.toLowerCase();
                if (!st.code.toLowerCase().includes(q) && !st.libelle.toLowerCase().includes(q)) return false;
              }
              return true;
            }),
          }))
          .filter((t) => t.sous_taches.length > 0),
      }))
      .filter((a) => a.taches.length > 0);
  }, [ptaData?.activites, filters, executionMap, pendingChanges]);

  const canEditSt = useCallback(
    (_st: SousTache) => {
      if (isAdmin) return true;
      if (roles.includes("agent_saisie") || roles.includes("responsable_activite")) return true;
      return false;
    },
    [isAdmin, roles]
  );

  const onChangePending = useCallback(
    (stId: string, change: Partial<PendingChange>) => {
      setPendingChanges((prev) => {
        const ex = executionMap[stId];
        const existing = prev[stId] ?? {
          avancement_pct: ex?.avancement_pct ?? 0,
          montant_realise: ex?.montant_realise ?? 0,
          statut: ex?.statut ?? "non_demarre",
          observations: ex?.observations ?? "",
        };
        return { ...prev, [stId]: { ...existing, ...change } };
      });
    },
    [executionMap]
  );

  const saveSingle = useCallback(
    async (stId: string) => {
      const p = pendingChanges[stId];
      if (!p || !exerciceId || !user) return;

      const existing = executionMap[stId];
      const payload = {
        sous_tache_id: stId,
        exercice_id: exerciceId,
        avancement_pct: p.avancement_pct,
        montant_realise: p.montant_realise,
        statut: p.statut,
        observations: p.observations,
        date_maj: new Date().toISOString(),
        updated_by: user.id,
      };

      try {
        if (existing) {
          const { error } = await supabase
            .from("executions")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("executions").insert(payload);
          if (error) throw error;
        }

        // Audit log
        await supabase.from("journal_audit").insert({
          user_id: user.id,
          entite: "execution",
          action: existing ? "update" : "create",
          ancienne_valeur: existing
            ? {
                avancement_pct: existing.avancement_pct,
                montant_realise: existing.montant_realise,
                statut: existing.statut,
              }
            : null,
          nouvelle_valeur: {
            avancement_pct: p.avancement_pct,
            montant_realise: p.montant_realise,
            statut: p.statut,
            sous_tache_id: stId,
          },
        });

        // Remove from pending
        setPendingChanges((prev) => {
          const next = { ...prev };
          delete next[stId];
          return next;
        });

        queryClient.invalidateQueries({ queryKey: ["executions"] });
        toast({ title: "Sauvegardé", description: "Les données d'exécution ont été mises à jour." });
      } catch (err: any) {
        toast({ title: "Erreur de sauvegarde", description: err.message, variant: "destructive" });
      }
    },
    [pendingChanges, executionMap, exerciceId, user, queryClient, toast]
  );

  const saveAll = useCallback(async () => {
    setSaving(true);
    const ids = Object.keys(pendingChanges);
    for (const stId of ids) {
      await saveSingle(stId);
    }
    setSaving(false);
    if (ids.length > 0) {
      toast({ title: "Tout sauvegardé", description: `${ids.length} sous-tâche(s) mise(s) à jour.` });
    }
  }, [pendingChanges, saveSingle, toast]);

  const pendingCount = Object.keys(pendingChanges).length;

  if (ptaLoading || exLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement de l'exécution…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-foreground">Suivi de l'Exécution</h1>

      <ExecutionFilterBar
        activites={ptaData?.activites ?? []}
        filters={filters}
        onChange={setFilters}
      />

      <ExecutionTreeView
        activites={filteredActivites as PtaActivite[]}
        executionMap={executionMap}
        pendingChanges={pendingChanges}
        onChangePending={onChangePending}
        onSaveSingle={saveSingle}
        onSelectSousTache={(st, tache, act) => {
          setSelectedSt(st);
          setSelectedTache(tache);
          setSelectedAct(act);
        }}
        canEditSt={canEditSt}
      />

      <ExecutionDetailPanel
        sousTache={selectedSt}
        parentTache={selectedTache}
        parentActivite={selectedAct}
        open={!!selectedSt}
        onClose={() => setSelectedSt(null)}
        canEdit={selectedSt ? canEditSt(selectedSt) : false}
        pending={selectedSt ? pendingChanges[selectedSt.id] ?? {
          avancement_pct: executionMap[selectedSt.id]?.avancement_pct ?? 0,
          montant_realise: executionMap[selectedSt.id]?.montant_realise ?? 0,
          statut: executionMap[selectedSt.id]?.statut ?? "non_demarre",
          observations: executionMap[selectedSt.id]?.observations ?? "",
        } : null}
        onChangePending={onChangePending}
        onSaveSingle={saveSingle}
      />

      {/* Floating save all button */}
      {pendingCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={saveAll}
            disabled={saving}
            className="shadow-lg h-12 px-6 text-sm gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder tout ({pendingCount})
          </Button>
        </div>
      )}
    </div>
  );
};

export default Execution;
