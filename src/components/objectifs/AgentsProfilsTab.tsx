import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllProfiles, useAssignations } from "@/hooks/useObjectifsData";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import ImportPersonnelSection from "./ImportPersonnelSection";

interface Props {
  exerciceId: string | null;
}

const AgentsProfilsTab = ({ exerciceId }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: profiles = [] } = useAllProfiles();
  const { data: assignations = [] } = useAssignations(exerciceId);

  const { data: agentsProfils = [] } = useQuery({
    queryKey: ["agents-profils-all"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_profils").select("*");
      return data ?? [];
    },
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles-supervisors"],
    queryFn: async () => {
      const { data } = await supabase.from("users_profiles").select("id, nom, prenom").eq("actif", true);
      return data ?? [];
    },
  });

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || `${p.nom} ${p.prenom} ${p.email}`.toLowerCase().includes(q);
  });

  const getAgentProfil = (userId: string) => agentsProfils.find(a => a.user_id === userId);
  const getAssignationCount = (userId: string) => assignations.filter(a => a.agent_id === userId).length;

  const openEdit = (userId: string) => {
    const ap = getAgentProfil(userId);
    setForm({
      matricule: ap?.matricule ?? "",
      direction: ap?.direction ?? "",
      service: ap?.service ?? "",
      poste_travail: ap?.poste_travail ?? "",
      superieur_id: ap?.superieur_id ?? "",
      date_recrutement: ap?.date_recrutement ?? "",
      date_reclassement: ap?.date_reclassement ?? "",
      anciennete_poste: ap?.anciennete_poste ?? "",
    });
    setEditingUserId(userId);
  };

  const handleSave = async () => {
    if (!editingUserId) return;
    const existing = getAgentProfil(editingUserId);
    const payload = {
      user_id: editingUserId,
      matricule: form.matricule || null,
      direction: form.direction || null,
      service: form.service || null,
      poste_travail: form.poste_travail || null,
      superieur_id: form.superieur_id || null,
      date_recrutement: form.date_recrutement || null,
      date_reclassement: form.date_reclassement || null,
      anciennete_poste: form.anciennete_poste || null,
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from("agents_profils").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("agents_profils").insert(payload));
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Profil agent enregistré" });
      qc.invalidateQueries({ queryKey: ["agents-profils-all"] });
      setEditingUserId(null);
    }
  };

  const editingProfile = editingUserId ? profiles.find(p => p.id === editingUserId) : null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un agent..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>PTI (nb ST)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => {
              const ap = getAgentProfil(p.id);
              const stCount = getAssignationCount(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nom} {p.prenom}</TableCell>
                  <TableCell>{ap?.matricule ?? "—"}</TableCell>
                  <TableCell>{ap?.poste_travail ?? "—"}</TableCell>
                  <TableCell>{ap?.direction ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={stCount > 0 ? "default" : "secondary"}>{stCount}</Badge>
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(p.id)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Profil
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Sheet open={!!editingUserId} onOpenChange={(v) => { if (!v) setEditingUserId(null); }}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>✏️ Profil agent — {editingProfile?.nom} {editingProfile?.prenom}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
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
                    {allProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nom} {p.prenom}</SelectItem>
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
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSave}>💾 Enregistrer</Button>
                <Button variant="outline" onClick={() => setEditingUserId(null)}>Annuler</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
};

export default AgentsProfilsTab;
