import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  activiteId: string;
  activiteCode: string;
  onCreated: () => void;
  onCancel: () => void;
}

const InlineAddTache = ({ activiteId, activiteCode, onCreated, onCancel }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [libelle, setLibelle] = useState("");
  const [livrables, setLivrables] = useState("");
  const [saving, setSaving] = useState(false);

  const libelleError = libelle.trim().length > 0 && libelle.trim().length < 5
    ? "Minimum 5 caractères requis" : libelle.length > 300 ? "Maximum 300 caractères" : null;

  const canSave = libelle.trim().length >= 5 && !libelleError && !saving;

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      const { data: newCode, error: codeErr } = await supabase.rpc("generate_tache_code", { p_activite_id: activiteId });
      if (codeErr) throw codeErr;

      const { data: maxOrdre } = await supabase.from("taches").select("ordre").eq("activite_id", activiteId).order("ordre", { ascending: false }).limit(1).maybeSingle();

      const { error } = await supabase.from("taches").insert({
        activite_id: activiteId,
        code: newCode,
        libelle: libelle.trim(),
        livrables: livrables.trim() || null,
        budget_total: 0,
        ordre: (maxOrdre?.ordre ?? 0) + 1,
      });
      if (error) throw error;

      await supabase.from("journal_audit").insert({
        user_id: user.id, action: "CREATE", entite: "tache",
        nouvelle_valeur: { code: newCode, libelle: libelle.trim(), activite_code: activiteCode } as any,
      });

      toast({ title: `✅ Tâche ${newCode} créée avec succès` });
      onCreated();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="border-t border-dashed border-secondary bg-card px-6 py-4 space-y-3">
      <div className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Plus className="h-4 w-4" /> Nouvelle tâche — Activité {activiteCode}
      </div>
      <p className="text-xs text-muted-foreground">Code généré automatiquement 🔒</p>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm">Libellé de la tâche *</Label>
          <span className={`text-xs ${libelle.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>{libelle.length}/300</span>
        </div>
        <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Suivi et évaluation des formations" maxLength={301} autoFocus
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); if (e.key === "Enter" && e.ctrlKey) handleSave(); }} />
        {libelleError && <p className="text-xs text-destructive">{libelleError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm">Livrables attendus</Label>
          <span className="text-xs text-muted-foreground">{livrables.length}/1000</span>
        </div>
        <Textarea value={livrables} onChange={(e) => setLivrables(e.target.value)} rows={3} maxLength={1000} placeholder="Un livrable par ligne"
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }} />
        <p className="text-xs text-muted-foreground">💡 Un livrable par ligne</p>
      </div>

      <p className="text-xs text-muted-foreground">⚠️ Le budget sera mis à jour automatiquement dès que vous ajouterez des sous-tâches.</p>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>✕ Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Créer la tâche
        </Button>
      </div>
    </div>
  );
};

export default InlineAddTache;
