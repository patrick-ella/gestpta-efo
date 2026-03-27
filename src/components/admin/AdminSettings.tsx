import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

export const AdminSettings = () => {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").single();
      return data;
    },
  });

  const { data: exercices = [] } = useQuery({
    queryKey: ["exercices-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("exercices").select("*").order("annee");
      return data || [];
    },
  });

  const [form, setForm] = useState<any>(null);
  const current = form || settings;

  const save = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const { error } = await supabase.from("app_settings").update({
        app_name: current.app_name,
        exercice_actif_id: current.exercice_actif_id,
        rapport_footer: current.rapport_footer,
        session_duration_min: current.session_duration_min,
        admin_email: current.admin_email,
        updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Paramètres sauvegardés");
      setForm(null);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  if (isLoading || !current) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const update = (key: string, val: any) => setForm({ ...current, [key]: val });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Paramètres généraux</h2>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Application</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nom de l'application</Label><Input value={current.app_name || ""} onChange={(e) => update("app_name", e.target.value)} /></div>
            <div>
              <Label>Exercice budgétaire actif</Label>
              <Select value={current.exercice_actif_id || ""} onValueChange={(v) => update("exercice_actif_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{exercices.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.annee}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pied de page des rapports</Label><Input value={current.rapport_footer || ""} onChange={(e) => update("rapport_footer", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Sécurité & Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Durée de session (minutes)</Label><Input type="number" value={current.session_duration_min || 60} onChange={(e) => update("session_duration_min", parseInt(e.target.value))} /></div>
            <div><Label>Email administrateur</Label><Input type="email" value={current.admin_email || ""} onChange={(e) => update("admin_email", e.target.value)} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
