import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSousTacheAssignations } from "@/hooks/useObjectifsData";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sousTacheId: string;
  sousTacheCode: string;
  exerciceId: string | null;
}

const SousTacheAgentsTab = ({ sousTacheId, sousTacheCode, exerciceId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ agent_id: "", role_agent: "contributeur", poids_objectif: "", date_limite: "", observations: "" });

  const { data: assignations = [], refetch } = useSousTacheAssignations(sousTacheId);

  // Search agents from agents_profils (EFO staff), NOT users_profiles
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-for-assign"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_profils")
        .select("id, nom, prenom, email, matricule, poste_travail, direction, user_id")
        .eq("actif", true)
        .order("nom");
      return data ?? [];
    },
  });

  // Get total poids for selected agent across all their assignations
  const { data: agentAllAssigns = [] } = useQuery({
    queryKey: ["agent-total-poids", assignForm.agent_id, exerciceId],
    queryFn: async () => {
      if (!assignForm.agent_id || !exerciceId) return [];
      const { data } = await supabase
        .from("assignations_sous_taches")
        .select("poids_objectif")
        .eq("agent_id", assignForm.agent_id)
        .eq("exercice_id", exerciceId);
      return data ?? [];
    },
    enabled: !!assignForm.agent_id && !!exerciceId,
  });

  const agentCurrentPoids = agentAllAssigns.reduce((s, a) => s + Number(a.poids_objectif), 0);
  const soldeDisponible = 100 - agentCurrentPoids;

  const handleAssign = async () => {
    if (!exerciceId || !user) return;
    const { error } = await supabase.from("assignations_sous_taches").insert({
      sous_tache_id: sousTacheId,
      agent_id: assignForm.agent_id,
      exercice_id: exerciceId,
      role_agent: assignForm.role_agent,
      poids_objectif: Number(assignForm.poids_objectif),
      date_limite: assignForm.date_limite || null,
      observations: assignForm.observations || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Agent assigné à cette sous-tâche" });
      setShowAssignModal(false);
      setAssignForm({ agent_id: "", role_agent: "contributeur", poids_objectif: "", date_limite: "", observations: "" });
      refetch();
      qc.invalidateQueries({ queryKey: ["assignations"] });
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("assignations_sous_taches").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent retiré" });
      refetch();
    }
  };

  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Agents assignés à cette sous-tâche</p>
          <p className="text-xs text-muted-foreground">Les agents assignés recevront cette sous-tâche comme objectif dans leur contrat d'objectifs annuel.</p>
        </div>
        {isAdmin && exerciceId && (
          <Button size="sm" onClick={() => setShowAssignModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Assigner un agent
          </Button>
        )}
      </div>

      {assignations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Aucun agent assigné</p>
          <p className="text-xs">Assignez des agents pour générer leurs contrats d'objectifs.</p>
          {isAdmin && exerciceId && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAssignModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Assigner un agent
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {assignations.map(a => {
            const agent = getAgent(a.agent_id);
            return (
              <div key={a.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">👤 {agent?.nom} {agent?.prenom}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent?.matricule ? `Matricule: ${agent.matricule}` : ""} {agent?.poste_travail ? `| ${agent.poste_travail}` : ""}
                      {agent?.user_id ? " 🟢" : " ⚪"}
                    </p>
                  </div>
                  <Badge variant={a.role_agent === "responsable" ? "default" : "secondary"}>
                    {a.role_agent === "responsable" ? "Responsable" : "Contributeur"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Poids: <strong>{Number(a.poids_objectif)}%</strong></span>
                  {a.date_limite && <span>Date limite: {a.date_limite}</span>}
                </div>
                {a.observations && <p className="text-xs text-muted-foreground italic">{a.observations}</p>}
                {isAdmin && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => handleRemove(a.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Retirer
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>👥 Assigner un agent EFO</DialogTitle>
            <p className="text-xs text-muted-foreground">Sous-tâche : {sousTacheCode}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Agent EFO *</Label>
              <Select value={assignForm.agent_id} onValueChange={v => setAssignForm(f => ({ ...f, agent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un agent..." /></SelectTrigger>
                <SelectContent>
                  {agents
                    .filter(a => !assignations.some(as => as.agent_id === a.id))
                    .map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nom} {a.prenom} {a.matricule ? `— ${a.matricule}` : ""} {a.poste_travail ? `— ${a.poste_travail}` : ""} {a.user_id ? "🟢" : "⚪"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Rôle *</Label>
              <Select value={assignForm.role_agent} onValueChange={v => setAssignForm(f => ({ ...f, role_agent: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsable">Responsable principal</SelectItem>
                  <SelectItem value="contributeur">Contributeur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Poids de l'objectif (%) *</Label>
              <Input type="number" min={1} max={100} value={assignForm.poids_objectif} onChange={e => setAssignForm(f => ({ ...f, poids_objectif: e.target.value }))} />
              {assignForm.agent_id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {agentCurrentPoids > 0 && <><AlertTriangle className="h-3 w-3 text-amber-500" /> Poids actuel: {agentCurrentPoids}% — Solde: {soldeDisponible}%</>}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Date limite</Label>
              <Input type="date" value={assignForm.date_limite} onChange={e => setAssignForm(f => ({ ...f, date_limite: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Observations (optionnel)</Label>
              <Textarea value={assignForm.observations} onChange={e => setAssignForm(f => ({ ...f, observations: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Annuler</Button>
              <Button onClick={handleAssign} disabled={!assignForm.agent_id || !assignForm.poids_objectif || Number(assignForm.poids_objectif) <= 0}>
                <Users className="h-3.5 w-3.5 mr-1" /> Assigner l'agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SousTacheAgentsTab;
