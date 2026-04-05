import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Download, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAssignations, useEvaluations } from "@/hooks/useObjectifsData";
import { useIsAdmin } from "@/hooks/useUserRoles";
import EvaluationFormPanel from "@/components/objectifs/EvaluationFormPanel";
import { generateFicheEvaluation } from "@/lib/reports/generateFicheEvaluation";
import { toast } from "sonner";

interface Props {
  exerciceId: string | null;
  exercice: number;
}

const EvaluationsTab = ({ exerciceId, exercice }: Props) => {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [generatingXlsx, setGeneratingXlsx] = useState<string | null>(null);

  // Use agents_profils as primary data source
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-profils-eval"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_profils").select("*").eq("actif", true);
      return data ?? [];
    },
  });

  const { data: assignations = [] } = useAssignations(exerciceId);
  const { data: evaluations = [] } = useEvaluations(exerciceId);

  // agent_id now references agents_profils.id
  const agentIds = [...new Set(assignations.map(a => a.agent_id))];
  const agentRows = agents
    .filter(a => agentIds.includes(a.id))
    .map(a => {
      const ev = evaluations.find(e => e.agent_id === a.id);
      return { agent: a, evaluation: ev };
    });

  const handleGenerateXlsx = async (row: typeof agentRows[0]) => {
    if (!row.evaluation) { toast.error("Aucune évaluation à exporter"); return; }
    setGeneratingXlsx(row.agent.id);
    try {
      const agentInfo = {
        nom_complet: `${row.agent.nom ?? ""} ${row.agent.prenom ?? ""}`.trim(),
        matricule: row.agent.matricule,
        direction: row.agent.direction,
        service: row.agent.service,
        poste_travail: row.agent.poste_travail,
        anciennete_poste: row.agent.anciennete_poste,
        date_recrutement: row.agent.date_recrutement,
        date_reclassement: row.agent.date_reclassement,
      };
      const agentAssigns = assignations.filter(a => a.agent_id === row.agent.id);
      const { data: sousTaches = [] } = await supabase.from("sous_taches").select("id, code, libelle");
      const { data: executions = [] } = await supabase.from("executions").select("*").eq("exercice_id", exerciceId!);
      const assignData = agentAssigns.map(a => {
        const st = (sousTaches ?? []).find(s => s.id === a.sous_tache_id);
        const exec = (executions ?? []).find(e => e.sous_tache_id === a.sous_tache_id);
        return {
          sous_tache_libelle: st?.libelle ?? "—",
          poids_objectif: Number(a.poids_objectif),
          date_limite: a.date_limite,
          extrants: [] as { libelle: string }[],
          avancement_pct: exec?.avancement_pct ?? 0,
          note_objectif: null,
        };
      });
      const ev = row.evaluation;
      const buffer = generateFicheEvaluation(agentInfo, {
        ...ev,
        evaluateur_nom: "",
        besoins_formation: Array.isArray(ev.besoins_formation) ? ev.besoins_formation : [],
      }, assignData, exercice);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fiche_Evaluation_${row.agent.matricule ?? row.agent.id}_${exercice}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fiche d'évaluation générée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setGeneratingXlsx(null);
    }
  };

  const statusBadge = (statut?: string) => {
    switch (statut) {
      case "finalise": return <Badge className="bg-green-100 text-green-800">✅ Finalisée</Badge>;
      case "en_evaluation": return <Badge className="bg-amber-100 text-amber-800">🔄 En cours</Badge>;
      default: return <Badge variant="secondary">Non commencée</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {agentRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucun agent à évaluer</p>
            <p className="text-sm">Assignez d'abord des sous-tâches aux agents.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Note réalisation</TableHead>
                <TableHead>Note globale</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentRows.map(row => (
                <TableRow key={row.agent.id}>
                  <TableCell className="font-medium">{row.agent.nom} {row.agent.prenom}</TableCell>
                  <TableCell>{row.agent.matricule ?? "—"}</TableCell>
                  <TableCell>{row.evaluation?.note_realisation != null ? `${row.evaluation.note_realisation}/10` : "—"}</TableCell>
                  <TableCell>{row.evaluation?.note_globale != null ? `${row.evaluation.note_globale}/20` : "—"}</TableCell>
                  <TableCell>{statusBadge(row.evaluation?.statut)}</TableCell>
                  <TableCell className="space-x-1">
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => setEditingAgentId(row.agent.id)}>
                        <Star className="h-3.5 w-3.5 mr-1" /> Évaluer
                      </Button>
                    )}
                    {row.evaluation && (
                      <Button size="sm" variant="outline" disabled={generatingXlsx === row.agent.id} onClick={() => handleGenerateXlsx(row)}>
                        {generatingXlsx === row.agent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                        .xlsx
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {editingAgentId && exerciceId && (
          <EvaluationFormPanel
            agentId={editingAgentId}
            exerciceId={exerciceId}
            open={!!editingAgentId}
            onClose={() => { setEditingAgentId(null); qc.invalidateQueries({ queryKey: ["evaluations"] }); }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EvaluationsTab;
