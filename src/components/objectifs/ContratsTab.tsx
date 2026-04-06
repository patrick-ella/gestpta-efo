import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAssignations } from "@/hooks/useObjectifsData";
import { generateContratObjectifs } from "@/lib/reports/generateContratObjectifs";
import { toast } from "sonner";

interface Props {
  exerciceId: string | null;
  exercice: number;
}

const ContratsTab = ({ exerciceId, exercice }: Props) => {
  const [generating, setGenerating] = useState<string | null>(null);
  const { data: assignations = [] } = useAssignations(exerciceId);

  // Use agents_profils as primary data source
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-profils-contrats"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_profils").select("*").eq("actif", true);
      return data ?? [];
    },
  });

  const { data: sousTaches = [] } = useQuery({
    queryKey: ["sous-taches-contrats"],
    queryFn: async () => {
      const { data } = await supabase.from("sous_taches").select("id, code, libelle, tache_id");
      return data ?? [];
    },
  });

  const { data: extrants = [] } = useQuery({
    queryKey: ["extrants-contrats"],
    queryFn: async () => {
      const { data } = await supabase.from("extrants").select("id, libelle, activite_id");
      return data ?? [];
    },
  });

  // Group assignations by agent (agent_id now references agents_profils.id)
  const agentMap = new Map<string, typeof assignations>();
  assignations.forEach(a => {
    const list = agentMap.get(a.agent_id) ?? [];
    list.push(a);
    agentMap.set(a.agent_id, list);
  });

  const agentRows = agents
    .filter(a => agentMap.has(a.id))
    .map(a => {
      const assigns = agentMap.get(a.id) ?? [];
      const totalPoids = assigns.reduce((s, as) => s + Number(as.poids_objectif), 0);
      return { agent: a, assigns, totalPoids };
    });

  const handleGenerate = async (row: typeof agentRows[0]) => {
    setGenerating(row.agent.id);
    try {
      const agentInfo = {
        nom_complet: `${row.agent.nom ?? ""} ${row.agent.prenom ?? ""}`.trim(),
        matricule: row.agent.matricule,
        direction: row.agent.direction,
        service: row.agent.service,
        poste_travail: row.agent.poste_travail,
      };

      const assignationData = row.assigns.map(a => {
        const st = sousTaches.find(s => s.id === a.sous_tache_id);
        return {
          sous_tache_libelle: st?.libelle ?? "—",
          sous_tache_code: st?.code ?? "—",
          poids_objectif: Number(a.poids_objectif),
          date_limite: a.date_limite,
          extrants: extrants.slice(0, 2).map(e => ({ libelle: e.libelle })),
        };
      });

      await generateContratObjectifs(agentInfo, assignationData, exercice);
      toast.success(`Contrat généré pour ${agentInfo.nom_complet}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur de génération");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {agentRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune assignation pour cet exercice</p>
            <p className="text-sm">Assignez des sous-tâches aux agents depuis l'onglet Agents du panneau de sous-tâche.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Nb objectifs</TableHead>
                <TableHead>Total poids</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentRows.map(row => (
                <TableRow key={row.agent.id}>
                  <TableCell className="font-medium">{row.agent.nom} {row.agent.prenom}</TableCell>
                  <TableCell>{row.agent.matricule ?? "—"}</TableCell>
                  <TableCell>{row.assigns.length}</TableCell>
                  <TableCell>
                    <span className={row.totalPoids === 100 ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                      {row.totalPoids}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.totalPoids === 100 ? (
                      <Badge className="bg-green-100 text-green-800">✅ Prêt</Badge>
                    ) : (
                      <Badge variant="destructive">❌ Incomplet</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={row.totalPoids !== 100 || generating === row.agent.id}
                      onClick={() => handleGenerate(row)}
                    >
                      {generating === row.agent.id ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Génération...</>
                      ) : (
                        <><Download className="h-3.5 w-3.5 mr-1" /> Générer PDF</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ContratsTab;
