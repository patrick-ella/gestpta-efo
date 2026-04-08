import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string | null;
  poste_travail?: string | null;
  user_id?: string | null;
}

interface Assignation {
  id: string;
  agent_id: string;
  poids_objectif: number;
  date_limite: string | null;
  role_agent: string;
  observations: string | null;
  exercice_id: string;
}

interface Props {
  assignation: Assignation;
  agent: Agent | undefined;
  canEdit: boolean;
  allAgentAssignations: { id: string; poids_objectif: number }[];
  onRemove: (id: string) => void;
}

const AssignationCard = ({ assignation, agent, canEdit, allAgentAssignations, onRemove }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [localPoids, setLocalPoids] = useState(Number(assignation.poids_objectif));
  const [localDate, setLocalDate] = useState(assignation.date_limite ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalPoids(Number(assignation.poids_objectif));
    setLocalDate(assignation.date_limite ?? "");
  }, [assignation.id, assignation.poids_objectif, assignation.date_limite]);

  const poidsAutres = allAgentAssignations
    .filter(a => a.id !== assignation.id)
    .reduce((s, a) => s + Number(a.poids_objectif), 0);
  const totalPoids = poidsAutres + localPoids;
  const poidsError = totalPoids > 100;
  const poidsEmpty = localPoids <= 0;
  const hasChanges = localPoids !== Number(assignation.poids_objectif) || localDate !== (assignation.date_limite ?? "");
  const canSave = hasChanges && !poidsError && !poidsEmpty;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("assignations_sous_taches")
      .update({
        poids_objectif: localPoids,
        date_limite: localDate || null,
      })
      .eq("id", assignation.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLocalPoids(Number(assignation.poids_objectif));
      setLocalDate(assignation.date_limite ?? "");
    } else {
      toast({ title: `✅ Assignation de ${agent?.prenom ?? ""} ${agent?.nom ?? ""} mise à jour` });
      qc.invalidateQueries({ queryKey: ["sous-tache-assignations"] });
      qc.invalidateQueries({ queryKey: ["assignations"] });
      qc.invalidateQueries({ queryKey: ["agent-total-poids"] });
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">👤 {agent?.nom} {agent?.prenom}</p>
          <p className="text-xs text-muted-foreground">
            {agent?.matricule ? `Matricule: ${agent.matricule}` : ""} {agent?.poste_travail ? `| ${agent.poste_travail}` : ""}
            {agent?.user_id ? " 🟢" : " ⚪"}
          </p>
        </div>
        <Badge variant={assignation.role_agent === "responsable" ? "default" : "secondary"}>
          {assignation.role_agent === "responsable" ? "Responsable" : "Contributeur"}
        </Badge>
      </div>

      {canEdit ? (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Poids de l'objectif (%) *</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={localPoids}
              onChange={e => setLocalPoids(Number(e.target.value))}
              className={poidsError ? "border-destructive" : ""}
            />
            <p className="text-[11px] text-muted-foreground">
              ℹ️ Total actuel de {agent?.prenom} {agent?.nom} : {totalPoids}% (incluant cet objectif)
            </p>
            {poidsError && (
              <p className="text-[11px] text-destructive">
                ⚠️ Le total des poids dépasse 100%. Max autorisé : {100 - poidsAutres}%
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date limite</Label>
            <Input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="text-xs"
            >
              {saving ? "⏳ Enregistrement..." : hasChanges ? <><Save className="h-3 w-3 mr-1" /> Enregistrer</> : <><Check className="h-3 w-3 mr-1" /> À jour</>}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => onRemove(assignation.id)}>
              <Trash2 className="h-3 w-3 mr-1" /> Retirer
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Poids: <strong>{Number(assignation.poids_objectif)}%</strong></span>
            {assignation.date_limite && <span>Date limite: {assignation.date_limite}</span>}
          </div>
          {assignation.observations && <p className="text-xs text-muted-foreground italic">{assignation.observations}</p>}
        </>
      )}
      {assignation.observations && canEdit && <p className="text-xs text-muted-foreground italic">{assignation.observations}</p>}
    </div>
  );
};

export default AssignationCard;
