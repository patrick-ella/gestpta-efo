import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, Image } from "lucide-react";
import { EfoLogo } from "@/components/ui/EfoLogo";
import { BudgetCoherence } from "@/components/admin/BudgetCoherence";

export const AdminSettings = () => {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/svg+xml", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PNG, SVG ou JPG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier dépasse la taille maximale de 2 Mo.");
      return;
    }

    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width < 200 || img.height < 200) {
        toast.error("Dimensions minimales requises : 200 × 200 px.");
        return;
      }
      setUploading(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `logo-efo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("livrables-pta")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from("livrables-pta")
          .getPublicUrl(path);

        const { error: dbErr } = await supabase.from("app_settings").update({
          logo_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        }).eq("id", 1);
        if (dbErr) throw dbErr;

        qc.invalidateQueries({ queryKey: ["app-settings"] });
        toast.success("Logo mis à jour avec succès");
      } catch {
        toast.error("Erreur lors du téléversement du logo");
      } finally {
        setUploading(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Fichier image invalide.");
    };
    img.src = url;
  };

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
        {/* Logo */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" /> Logo de l'application</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-3 bg-muted/30">
                {current.logo_url ? (
                  <img src={current.logo_url} alt="Logo actuel" className="h-[120px] w-auto object-contain" />
                ) : (
                  <EfoLogo size="lg" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <input ref={fileInputRef} type="file" accept=".png,.svg,.jpg,.jpeg" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Modifier le logo
                </Button>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Format recommandé : PNG ou SVG avec fond transparent</p>
                  <p>Dimensions minimales : 200 × 200 px</p>
                  <p>Taille maximale : 2 Mo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application */}
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

        {/* Sécurité */}
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
