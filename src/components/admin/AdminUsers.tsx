import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, KeyRound, Ban, CheckCircle, Loader2, Info } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Administrateur principal",
  admin_pta: "Administrateur PTA",
  responsable_activite: "Responsable d'activité",
  agent_saisie: "Agent de saisie",
  consultant: "Consultant externe",
};

const ROLES = Object.keys(ROLE_LABELS);
const CENTRES = ["Yaoundé", "Douala", "Les deux"];

export const AdminUsers = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", role: "consultant", centre: "Yaoundé" });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rôle mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ user_id, actif }: { user_id: string; actif: boolean }) =>
      callAdmin({ action: "toggle_active", user_id, actif }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwd = useMutation({
    mutationFn: (email: string) => callAdmin({ action: "reset_password", email }),
    onSuccess: () => toast.success("Email de réinitialisation envoyé"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Cette page gère les comptes d'accès à l'application. Pour gérer le personnel EFO (contrats d'objectifs, évaluations), allez dans 👥 Objectifs & Évaluation.
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
                      <Badge className="bg-green-100 text-green-800 text-xs">Oui — {u.agentProfil.matricule ?? ""}</Badge>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
