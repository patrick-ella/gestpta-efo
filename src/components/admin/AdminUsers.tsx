import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, KeyRound, Ban, CheckCircle, Loader2, Info, Lock, Trash2, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ResetPasswordModal } from "@/components/admin/ResetPasswordModal";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Administrateur principal",
  admin_pta: "Administrateur PTA",
  responsable_activite: "Responsable d'activité",
  agent_saisie: "Agent de saisie",
  consultant: "Consultant externe",
};

const PROTECTED_ROLES = ["super_admin", "admin_pta", "responsable_activite", "agent_saisie", "consultant"];
const ROLES = Object.keys(ROLE_LABELS);
const CENTRES = ["Yaoundé", "Douala", "Les deux"];
const DIRECTIONS = [
  "Formation Continue", "Centre Tests Anglais", "Formations Initiales",
  "Outils/Infrastructure", "Qualité/Fonctionnement", "Direction Générale", "Administration Générale",
];

export const AdminUsers = () => {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", role: "consultant", centre: "Yaoundé" });
  const { data: currentUserRoles = [] } = useUserRoles();
  const isSuperAdmin = currentUserRoles.includes("super_admin");

  // Reset password modal state
  const [resetPwdUser, setResetPwdUser] = useState<any>(null);

  // Transfer state
  const [transferUser, setTransferUser] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({ nom: "", prenom: "", matricule: "", direction: "", service: "", poste: "", superieurId: "", dateRecr: "", dateReclas: "", anciennete: "" });

  // Delete state
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteOption, setDeleteOption] = useState<"app_only" | "both">("app_only");
  const [confirmEmail, setConfirmEmail] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("users_profiles").select("*").order("created_at");
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: agentsProfiles } = await supabase.from("agents_profils").select("id, user_id, matricule, poste_travail, direction");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "consultant",
        agentProfil: agentsProfiles?.find((ap) => ap.user_id === p.id) || null,
      }));
    },
  });

  const { data: allAgentsForSup = [] } = useQuery({
    queryKey: ["agents-for-sup-select"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_profils").select("id, nom, prenom, poste_travail").eq("actif", true).order("nom");
      return data ?? [];
    },
  });

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

  const createUser = useMutation({
    mutationFn: () => callAdmin({ action: "create_user", ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur créé avec succès");
      setOpen(false);
      setForm({ nom: "", prenom: "", email: "", password: "", role: "consultant", centre: "Yaoundé" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: string }) =>
      callAdmin({ action: "update_role", user_id, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Rôle mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ user_id, actif }: { user_id: string; actif: boolean }) =>
      callAdmin({ action: "toggle_active", user_id, actif }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Statut mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwd = useMutation({
    mutationFn: (email: string) => callAdmin({ action: "reset_password", email }),
    onSuccess: () => toast.success("Email de réinitialisation envoyé"),
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMut = useMutation({
    mutationFn: () => callAdmin({
      action: "transfer_to_staff",
      user_id: transferUser.id,
      email: transferUser.email,
      nom: transferForm.nom,
      prenom: transferForm.prenom,
      matricule: transferForm.matricule,
      direction: transferForm.direction,
      service: transferForm.service,
      poste_travail: transferForm.poste,
      superieur_id: transferForm.superieurId || null,
      date_recrutement: transferForm.dateRecr || null,
      date_reclassement: transferForm.dateReclas || null,
      anciennete_poste: transferForm.anciennete || null,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      toast.success(data?.linked
        ? `✅ Compte lié au profil EFO existant`
        : `✅ ${transferForm.prenom} ${transferForm.nom} ajouté(e) au personnel EFO`
      );
      setTransferUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => callAdmin({
      action: "delete_user",
      user_id: deleteUser.id,
      delete_staff_too: deleteOption === "both",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      toast.success(deleteOption === "both"
        ? `🗑 Compte et profil EFO de ${deleteUser.prenom || ""} ${deleteUser.nom || ""} supprimés`
        : `🗑 Compte de ${deleteUser.prenom || ""} ${deleteUser.nom || ""} supprimé`
      );
      setDeleteUser(null);
      setConfirmEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openTransfer = (u: any) => {
    setTransferForm({
      nom: u.nom || "", prenom: u.prenom || "",
      matricule: "", direction: "", service: "", poste: "",
      superieurId: "", dateRecr: "", dateReclas: "", anciennete: "",
    });
    setTransferUser(u);
  };

  const openDelete = (u: any) => {
    setDeleteUser(u);
    setDeleteOption(u.agentProfil ? "app_only" : "app_only");
    setConfirmEmail("");
  };

  const isDeletable = (u: any) => {
    if (!currentUser) return false;
    if (currentUser.id === u.id) return false;
    if (PROTECTED_ROLES.includes(u.role)) return false;
    return true;
  };

  const getBlockReason = (u: any) => {
    if (currentUser?.id === u.id) return "Vous ne pouvez pas supprimer votre propre compte.";
    if (PROTECTED_ROLES.includes(u.role)) return `Le rôle « ${ROLE_LABELS[u.role] || u.role} » est protégé. Modifiez le rôle avant de supprimer.`;
    return null;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Cette page gère les comptes d'accès à l'application. Pour gérer le personnel EFO (contrats d'objectifs, évaluations), allez dans 👥 Objectifs & Évaluation.
          Les rôles protégés (Administrateur, PTA, Responsable, Agent, Consultant) ne peuvent pas être supprimés directement — modifiez d'abord le rôle.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Utilisateurs de l'application</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Créer un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                <div><Label>Prénom</Label><Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Mot de passe temporaire</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Centre</Label>
                <Select value={form.centre} onValueChange={(v) => setForm({ ...form, centre: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CENTRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createUser.mutate()} disabled={createUser.isPending || !form.email || !form.password}>
                {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead><TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead><TableHead>Centre</TableHead>
                <TableHead>Personnel EFO</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nom || "—"} {u.prenom || ""}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => updateRole.mutate({ user_id: u.id, role: v })}>
                      <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{u.centre || "—"}</Badge></TableCell>
                  <TableCell>
                    {u.agentProfil ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">✅ EFO lié — {u.agentProfil.matricule ?? ""}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Non (externe)</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.actif !== false ? "default" : "destructive"} className="text-xs">
                      {u.actif !== false ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" title="Réinitialiser le mot de passe" onClick={() => resetPwd.mutate(u.email)}>
                        <KeyRound className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={u.actif !== false ? "destructive" : "default"}
                        size="sm"
                        title={u.actif !== false ? "Désactiver" : "Activer"}
                        onClick={() => toggleActive.mutate({ user_id: u.id, actif: u.actif === false })}
                      >
                        {u.actif !== false ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      </Button>
                      {/* Transfer to EFO */}
                      {!u.agentProfil ? (
                        <Button variant="outline" size="sm" title="Transférer vers le personnel EFO" onClick={() => openTransfer(u)}>
                          <Users className="h-3 w-3" />
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-green-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Personnel EFO lié</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Delete */}
                      {isDeletable(u) ? (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" title="Supprimer" onClick={() => openDelete(u)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-1.5">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] text-xs">{getBlockReason(u)}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Transfer Modal */}
      <Dialog open={!!transferUser} onOpenChange={(v) => { if (!v) setTransferUser(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>👤 Transférer vers le personnel EFO</DialogTitle>
            <DialogDescription>Compte : {transferUser?.nom} {transferUser?.prenom} ({transferUser?.email})</DialogDescription>
          </DialogHeader>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Cette action créera un profil agent EFO pour cet utilisateur. Son compte de connexion et ses droits dans l'application sont conservés intégralement.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Nom</Label><Input value={transferForm.nom} onChange={e => setTransferForm(f => ({ ...f, nom: e.target.value }))} /></div>
              <div><Label className="text-sm">Prénom</Label><Input value={transferForm.prenom} onChange={e => setTransferForm(f => ({ ...f, prenom: e.target.value }))} /></div>
            </div>
            <div><Label className="text-sm">Email</Label><Input value={transferUser?.email ?? ""} disabled className="bg-muted" /></div>
            <div><Label className="text-sm">Matricule *</Label><Input value={transferForm.matricule} onChange={e => setTransferForm(f => ({ ...f, matricule: e.target.value }))} /></div>
            <div><Label className="text-sm">Direction *</Label><Input value={transferForm.direction} onChange={e => setTransferForm(f => ({ ...f, direction: e.target.value }))} placeholder="Ex: Ecole de Formation de la CCAA" /></div>
            <div><Label className="text-sm">Service/Bureau</Label><Input value={transferForm.service} onChange={e => setTransferForm(f => ({ ...f, service: e.target.value }))} /></div>
            <div><Label className="text-sm">Poste de travail *</Label><Input value={transferForm.poste} onChange={e => setTransferForm(f => ({ ...f, poste: e.target.value }))} /></div>
            <div><Label className="text-sm">Supérieur hiérarchique (N+1)</Label>
              <Select value={transferForm.superieurId} onValueChange={v => setTransferForm(f => ({ ...f, superieurId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {allAgentsForSup.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nom} {a.prenom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Date recrutement</Label><Input type="date" value={transferForm.dateRecr} onChange={e => setTransferForm(f => ({ ...f, dateRecr: e.target.value }))} /></div>
              <div><Label className="text-sm">Date reclassement</Label><Input type="date" value={transferForm.dateReclas} onChange={e => setTransferForm(f => ({ ...f, dateReclas: e.target.value }))} /></div>
            </div>
            <div><Label className="text-sm">Ancienneté au poste</Label><Input value={transferForm.anciennete} onChange={e => setTransferForm(f => ({ ...f, anciennete: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferUser(null)}>Annuler</Button>
            <Button
              onClick={() => transferMut.mutate()}
              disabled={transferMut.isPending || !transferForm.matricule || !transferForm.direction || !transferForm.poste}
            >
              {transferMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Créer le profil agent EFO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteUser} onOpenChange={(v) => { if (!v) { setDeleteUser(null); setConfirmEmail(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🗑 Supprimer le compte utilisateur</DialogTitle>
            <DialogDescription>
              {deleteUser?.nom} {deleteUser?.prenom} ({deleteUser?.email})
              {deleteUser?.role ? ` — Rôle : ${ROLE_LABELS[deleteUser.role] || deleteUser.role}` : ""}
            </DialogDescription>
          </DialogHeader>

          {deleteUser?.agentProfil ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  ⚠️ Cet utilisateur est également un agent EFO (Matricule : {deleteUser.agentProfil.matricule ?? "—"} — {deleteUser.agentProfil.direction ?? ""}).
                </AlertDescription>
              </Alert>
              <RadioGroup value={deleteOption} onValueChange={(v: any) => setDeleteOption(v)}>
                <div className="flex items-start gap-2 p-3 rounded-md border">
                  <RadioGroupItem value="app_only" id="del-app" className="mt-1" />
                  <Label htmlFor="del-app" className="text-sm cursor-pointer">
                    <span className="font-medium">Supprimer uniquement le compte app</span><br />
                    <span className="text-xs text-muted-foreground">Le profil agent EFO est conservé (contrats, évaluations, assignations intacts).</span>
                  </Label>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30">
                  <RadioGroupItem value="both" id="del-both" className="mt-1" />
                  <Label htmlFor="del-both" className="text-sm cursor-pointer">
                    <span className="font-medium text-destructive">Supprimer le compte app ET le profil EFO</span><br />
                    <span className="text-xs text-muted-foreground">Suppression totale — contrats, évaluations et assignations supprimés. IRRÉVERSIBLE.</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                ⚠️ Cette action supprimera son compte de connexion et son profil utilisateur. IRRÉVERSIBLE.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-sm">Saisissez l'email pour confirmer :</Label>
            <Input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder={deleteUser?.email} className="mt-1" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteUser(null); setConfirmEmail(""); }}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending || confirmEmail.trim().toLowerCase() !== (deleteUser?.email || "").toLowerCase()}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
