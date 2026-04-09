import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Plus, Trash2, Lock, RotateCcw, Save, Loader2, Sparkles, Info } from "lucide-react";

const MODULES = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "cadre_logique", label: "Cadre Logique" },
  { key: "pta", label: "Plan de Travail" },
  { key: "execution", label: "Exécution" },
  { key: "extrants", label: "Extrants" },
  { key: "rapports", label: "Rapports" },
  { key: "objectifs_evaluation", label: "Objectifs & Évaluation" },
  { key: "administration", label: "Administration" },
];

const PERMISSIONS = [
  { key: "can_read", label: "Lire" },
  { key: "can_create", label: "Créer" },
  { key: "can_update", label: "Modifier" },
  { key: "can_delete", label: "Supprimer" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  admin_pta: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  responsable_activite: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  agent_saisie: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  consultant: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300",
};

interface RoleRow {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  roles_permissions: PermRow[];
}

interface PermRow {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export const AdminRolesPermissions = () => {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nom: "", code: "", description: "", templateRole: "" });
  const [localPerms, setLocalPerms] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, code, libelle, description, is_system, is_active, roles_permissions(module, can_read, can_create, can_update, can_delete)")
        .order("is_system", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as RoleRow[];
    },
  });

  const activeRole = roles.find((r) => r.code === selectedRole);

  useEffect(() => {
    if (activeRole) {
      setLocalPerms(
        MODULES.map((m) => {
          const existing = activeRole.roles_permissions.find((p) => p.module === m.key);
          return existing ?? { module: m.key, can_read: false, can_create: false, can_update: false, can_delete: false };
        })
      );
    }
  }, [selectedRole, activeRole]);

  const originalPerms = activeRole
    ? MODULES.map((m) => {
        const existing = activeRole.roles_permissions.find((p) => p.module === m.key);
        return existing ?? { module: m.key, can_read: false, can_create: false, can_update: false, can_delete: false };
      })
    : [];

  const hasChanges = JSON.stringify(localPerms) !== JSON.stringify(originalPerms);

  const togglePerm = (module: string, key: string) => {
    setLocalPerms((prev) =>
      prev.map((p) => (p.module === module ? { ...p, [key]: !(p as any)[key] } : p))
    );
  };

  const handleSave = async () => {
    if (!activeRole || !hasChanges) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("roles_permissions").upsert(
        localPerms.map((p) => ({
          role_code: activeRole.code,
          module: p.module,
          can_read: p.can_read,
          can_create: p.can_create,
          can_update: p.can_update,
          can_delete: p.can_delete,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "role_code,module" }
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      toast.success(`Permissions de « ${activeRole.libelle} » enregistrées`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.nom) return;
    setCreating(true);
    try {
      const codeClean = (createForm.code || createForm.nom).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const { data: newRole, error: roleErr } = await supabase
        .from("roles")
        .insert({ code: codeClean, libelle: createForm.nom, description: createForm.description || null, is_system: false, is_active: true })
        .select()
        .single();
      if (roleErr) throw roleErr;

      let permsToInsert: any[];
      if (createForm.templateRole) {
        const template = roles.find((r) => r.code === createForm.templateRole);
        permsToInsert = MODULES.map((m) => {
          const tp = template?.roles_permissions.find((p) => p.module === m.key);
          return { role_code: codeClean, module: m.key, can_read: tp?.can_read ?? false, can_create: tp?.can_create ?? false, can_update: tp?.can_update ?? false, can_delete: tp?.can_delete ?? false };
        });
      } else {
        permsToInsert = MODULES.map((m) => ({ role_code: codeClean, module: m.key, can_read: false, can_create: false, can_update: false, can_delete: false }));
      }
      await supabase.from("roles_permissions").insert(permsToInsert);

      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      toast.success(`Rôle « ${createForm.nom} » créé`);
      setCreateOpen(false);
      setCreateForm({ nom: "", code: "", description: "", templateRole: "" });
      setSelectedRole(codeClean);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (role: RoleRow) => {
    if (role.is_system) {
      toast.error("Les rôles système ne peuvent pas être supprimés.");
      return;
    }
    const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", role.code as any);
    if (count && count > 0) {
      toast.error(`Ce rôle est assigné à ${count} utilisateur(s). Réassignez-les avant de supprimer.`);
      return;
    }
    if (!confirm(`Supprimer le rôle « ${role.libelle} » ?`)) return;
    await supabase.from("roles").delete().eq("code", role.code);
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
    if (selectedRole === role.code) setSelectedRole(null);
    toast.success(`Rôle « ${role.libelle} » supprimé`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" /> Gestion des Rôles & Permissions
          </h2>
          <p className="text-sm text-muted-foreground">Définissez les droits d'accès par rôle pour chaque module</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Créer un rôle
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {roles.map((role) => (
          <Card
            key={role.code}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedRole === role.code ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedRole(role.code)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={ROLE_COLORS[role.code] || "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"}>
                  {role.libelle}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{role.description || "—"}</p>
              <div className="flex items-center gap-1">
                {role.is_system ? (
                  <Badge variant="outline" className="text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" /> Système</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions editor */}
      {activeRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" /> Permissions — {activeRole.libelle}
                </CardTitle>
                <CardDescription>
                  {activeRole.code}{activeRole.is_system && " · Rôle système (non supprimable)"}
                </CardDescription>
              </div>
              {hasChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                  ● Modifications non enregistrées
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRole.code === "super_admin" && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Les permissions de l'Administrateur Principal ne peuvent pas être modifiées.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    {PERMISSIONS.map((perm) => (
                      <TableHead key={perm.key} className="text-center w-[100px]">{perm.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((mod) => {
                    const modPerm = localPerms.find((p) => p.module === mod.key);
                    return (
                      <TableRow key={mod.key}>
                        <TableCell className="font-medium text-sm">{mod.label}</TableCell>
                        {PERMISSIONS.map((perm) => (
                          <TableCell key={perm.key} className="text-center">
                            <Checkbox
                              checked={(modPerm as any)?.[perm.key] ?? false}
                              onCheckedChange={() => togglePerm(mod.key, perm.key)}
                              disabled={activeRole.code === "super_admin"}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={!hasChanges} onClick={() => setLocalPerms(originalPerms)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
              </Button>
              <Button disabled={!hasChanges || saving || activeRole.code === "super_admin"} onClick={handleSave}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer les permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Role Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Créer un nouveau rôle</DialogTitle>
            <DialogDescription>Définissez un rôle personnalisé avec ses propres permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du rôle *</Label>
              <Input
                value={createForm.nom}
                onChange={(e) => {
                  const nom = e.target.value;
                  const code = nom.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                  setCreateForm((f) => ({ ...f, nom, code }));
                }}
                placeholder="Ex : Coordinateur régional"
              />
            </div>
            <div>
              <Label>Code (auto-généré, modifiable)</Label>
              <Input value={createForm.code} onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))} placeholder="coordinateur_regional" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Accès en lecture + saisie rapports" rows={2} />
            </div>
            <div>
              <Label>Copier les permissions d'un rôle existant</Label>
              <Select value={createForm.templateRole} onValueChange={(v) => setCreateForm((f) => ({ ...f, templateRole: v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun (permissions vides)" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating || !createForm.nom}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Créer le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
