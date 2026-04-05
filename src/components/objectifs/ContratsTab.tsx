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

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-contrats"],
    queryFn: async () => {
      const { data } = await supabase.from("users_profiles").select("*").eq("actif", true);
      return data ?? [];
    },
  });

  const { data: agentsProfils = [] } = useQuery({
    queryKey: ["agents-profils-contrats"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_profils").select("*");
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

  // Group assignations by agent
  const agentMap = new Map<string, typeof assignations>();
  assignations.forEach(a => {
    const list = agentMap.get(a.agent_id) ?? [];
    list.push(a);
    agentMap.set(a.agent_id, list);
  });

  const agentRows = profiles
    .filter(p => agentMap.has(p.id))
    .map(p => {
      const assigns = agentMap.get(p.id) ?? [];
      const totalPoids = assigns.reduce((s, a) => s + Number(a.poids_objectif), 0);
      const ap = agentsProfils.find(a => a.user_id === p.id);
      return { profile: p, agentProfil: ap, assigns, totalPoids };
    });

  const handleGenerate = async (row: typeof agentRows[0]) => {
    setGenerating(row.profile.id);
    try {
      const agentInfo = {
        nom_complet: `${row.profile.nom ?? ""} ${row.profile.prenom ?? ""}`.trim(),
        matricule: row.agentProfil?.matricule,
        direction: row.agentProfil?.direction,
        service: row.agentProfil?.service,
        poste_travail: row.agentProfil?.poste_travail,
      };

      const assignationData = row.assigns.map(a => {
        const st = sousTaches.find(s => s.id === a.sous_tache_id);
        return {
          sous_tache_libelle: st?.libelle ?? "—",
          sous_tache_code: st?.code ?? "—",
          poids_objectif: Number(a.poids_objectif),
          date_limite: a.date_limite,
          extrants: extrants
            .filter(e => e.activite_id) // simplified — in production, map through tache→activite
            .slice(0, 2)
            .map(e => ({ libelle: e.libelle })),
        };
      });

      const buffer = await generateContratObjectifs(agentInfo, assignationData, exercice);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contrat_Objectifs_${row.agentProfil?.matricule ?? row.profile.id}_${exercice}.docx`;
      a.click();
      URL.revokeObjectURL(url);
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
                <TableRow key={row.profile.id}>
                  <TableCell className="font-medium">{row.profile.nom} {row.profile.prenom}</TableCell>
                  <TableCell>{row.agentProfil?.matricule ?? "—"}</TableCell>
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
                      disabled={row.totalPoids !== 100 || generating === row.profile.id}
                      onClick={() => handleGenerate(row)}
                    >
                      {generating === row.profile.id ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Génération...</>
                      ) : (
                        <><Download className="h-3.5 w-3.5 mr-1" /> Générer .docx</>
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
