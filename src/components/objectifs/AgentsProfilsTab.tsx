import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Pencil, Info, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAssignations } from "@/hooks/useObjectifsData";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import ImportPersonnelSection from "./ImportPersonnelSection";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  exerciceId: string | null;
}

const AgentsProfilsTab = ({ exerciceId }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState("");
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  // Delete state
  const [deleteAgent, setDeleteAgent] = useState<any>(null);
  const [confirmMatricule, setConfirmMatricule] = useState("");

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-profils-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_profils")
        .select("*")
        .eq("actif", true)
        .order("nom");
      return data ?? [];
    },
  });

  const { data: assignations = [] } = useAssignations(exerciceId);

  const { data: allAgentsForSup = [] } = useQuery({
    queryKey: ["agents-for-sup-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_profils")
        .select("id, nom, prenom, poste_travail")
        .eq("actif", true)
        .order("nom");
      return data ?? [];
    },
  });

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return !q || `${a.nom} ${a.prenom} ${a.email} ${a.matricule}`.toLowerCase().includes(q);
  });

  const getAssignationCount = (agentId: string) => assignations.filter(a => a.agent_id === agentId).length;

  const openEdit = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setForm({
      nom: agent.nom ?? "",
      prenom: agent.prenom ?? "",
      email: agent.email ?? "",
      matricule: agent.matricule ?? "",
      direction: agent.direction ?? "",
      service: agent.service ?? "",
      poste_travail: agent.poste_travail ?? "",
      superieur_id: agent.superieur_id ?? "",
      date_recrutement: agent.date_recrutement ?? "",
      date_reclassement: agent.date_reclassement ?? "",
      anciennete_poste: agent.anciennete_poste ?? "",
    });
    setEditingAgentId(agentId);
  };

  const handleSave = async () => {
    if (!editingAgentId) return;
    const payload = {
      nom: form.nom || null,
      prenom: form.prenom || null,
      email: form.email || null,
      matricule: form.matricule || null,
      direction: form.direction || null,
      service: form.service || null,
      poste_travail: form.poste_travail || null,
      superieur_id: form.superieur_id || null,
      date_recrutement: form.date_recrutement || null,
      date_reclassement: form.date_reclassement || null,
      anciennete_poste: form.anciennete_poste || null,
    };

    const { error } = await supabase
      .from("agents_profils")
      .update(payload)
      .eq("id", editingAgentId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Profil agent enregistré" });
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      qc.invalidateQueries({ queryKey: ["agents-for-sup-select"] });
      setEditingAgentId(null);
    }
  };

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await supabase.functions.invoke("admin-users", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (resp.error) throw new Error(resp.error.message);
    if (resp.data?.error) throw new Error(resp.data.error);
    return resp.data;
  };

  const deleteAgentMut = useMutation({
    mutationFn: () => callAdmin({ action: "delete_agent", agent_id: deleteAgent.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      qc.invalidateQueries({ queryKey: ["agents-for-sup-select"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      const hasAccount = !!deleteAgent.user_id;
      sonnerToast.success(
        hasAccount
          ? `🗑 ${deleteAgent.nom} ${deleteAgent.prenom} retiré(e) du personnel EFO — compte app conservé`
          : `🗑 Agent ${deleteAgent.nom} ${deleteAgent.prenom} supprimé du personnel EFO`
      );
      setDeleteAgent(null);
      setConfirmMatricule("");
    },
    onError: (e: Error) => sonnerToast.error(e.message),
  });

  const editingAgent = editingAgentId ? agents.find(a => a.id === editingAgentId) : null;

  return (
    <div className="space-y-4">
      {isAdmin && <ImportPersonnelSection />}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un agent EFO..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom & Prénom</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>PTI (nb ST)</TableHead>
                <TableHead>Compte app</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(agent => {
                const stCount = getAssignationCount(agent.id);
                const hasAccount = !!agent.user_id;
                return (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.nom} {agent.prenom}</TableCell>
                    <TableCell>{agent.matricule ?? "—"}</TableCell>
                    <TableCell>{agent.poste_travail ?? "—"}</TableCell>
                    <TableCell>{agent.direction ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={stCount > 0 ? "default" : "secondary"}>{stCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {hasAccount ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">🟢 Compte actif</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">⚪ Sans compte</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(agent.id)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Profil
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setDeleteAgent(agent); setConfirmMatricule(""); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun agent EFO enregistré. Importez la liste du personnel via le gabarit Excel ou ajoutez les agents un par un.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Edit Sheet */}
          <Sheet open={!!editingAgentId} onOpenChange={(v) => { if (!v) setEditingAgentId(null); }}>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>✏️ Agent EFO — {editingAgent?.nom} {editingAgent?.prenom}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Nom</Label>
                    <Input value={form.nom ?? ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Prénom</Label>
                    <Input value={form.prenom ?? ""} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Email</Label>
                  <Input value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                {([
                  ["matricule", "Matricule"],
                  ["direction", "Direction"],
                  ["service", "Service / Bureau"],
                  ["poste_travail", "Poste de travail"],
                  ["anciennete_poste", "Ancienneté au poste"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">{label}</Label>
                    <Input value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-sm">Supérieur (N+1)</Label>
                  <Select value={form.superieur_id ?? ""} onValueChange={v => setForm(f => ({ ...f, superieur_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {allAgentsForSup
                        .filter(a => a.id !== editingAgentId)
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.nom} {a.prenom}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {([
                  ["date_recrutement", "Date de recrutement"],
                  ["date_reclassement", "Date de reclassement"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">{label}</Label>
                    <Input type="date" value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Cet agent est un membre du personnel EFO. S'il doit également accéder à l'application, créez son compte dans Administration → Utilisateurs en indiquant son email.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave}>💾 Enregistrer</Button>
                  <Button variant="outline" onClick={() => setEditingAgentId(null)}>Annuler</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Delete Agent Dialog */}
          <Dialog open={!!deleteAgent} onOpenChange={(v) => { if (!v) { setDeleteAgent(null); setConfirmMatricule(""); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>🗑 Supprimer l'agent EFO</DialogTitle>
                <DialogDescription>
                  {deleteAgent?.nom} {deleteAgent?.prenom} — Matricule : {deleteAgent?.matricule ?? "—"}
                  {deleteAgent?.direction ? ` — ${deleteAgent.direction}` : ""}
                </DialogDescription>
              </DialogHeader>

              {deleteAgent?.user_id ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    ⚠️ Cet agent possède un compte de connexion à l'application. Cette suppression retirera l'agent de la liste du personnel EFO et supprimera ses contrats et évaluations, mais <strong>conservera son compte de connexion</strong>. Pour supprimer également son compte app, allez dans Administration → Utilisateurs.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    ⚠️ Cette suppression entraînera : retrait de la liste du personnel EFO, suppression de ses assignations ST, contrats d'objectifs et fiches d'évaluation. IRRÉVERSIBLE.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-sm">Saisissez le matricule pour confirmer :</Label>
                <Input
                  value={confirmMatricule}
                  onChange={e => setConfirmMatricule(e.target.value)}
                  placeholder={deleteAgent?.matricule ?? "matricule"}
                  className="mt-1"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteAgent(null); setConfirmMatricule(""); }}>Annuler</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteAgentMut.mutate()}
                  disabled={
                    deleteAgentMut.isPending ||
                    !deleteAgent?.matricule ||
                    confirmMatricule.trim() !== (deleteAgent?.matricule || "").trim()
                  }
                >
                  {deleteAgentMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {deleteAgent?.user_id ? "Retirer du personnel EFO" : "Supprimer l'agent"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentsProfilsTab;
