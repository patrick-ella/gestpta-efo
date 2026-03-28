import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import EditHistory from "@/components/pta/EditHistory";
import { Pencil, Save } from "lucide-react";

interface Props {
  id: string;
  code: string;
  libelle: string;
  objectifOperationnel: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const InlineEditActivite = ({ id, code, libelle, objectifOperationnel, onSaved, onCancel }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lib, setLib] = useState(libelle);
  const [obj, setObj] = useState(objectifOperationnel ?? "");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const hasChanges = lib !== libelle || obj !== (objectifOperationnel ?? "");
  const libError = lib.trim().length < 5 ? "Minimum 5 caractères requis" : lib.length > 300 ? "Maximum 300 caractères" : null;
  const canSave = !libError && hasChanges;

  const handleCancel = () => {
    if (hasChanges) { setShowConfirm(true); } else { onCancel(); }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("activites").update({ libelle: lib.trim(), objectif_operationnel: obj.trim() || null }).eq("id", id);
      if (error) throw error;
      await supabase.from("journal_audit").insert({
        user_id: user!.id, action: "UPDATE", entite: "activite",
        ancienne_valeur: { reference: code, libelle, objectif_operationnel: objectifOperationnel },
        nouvelle_valeur: { reference: code, libelle: lib.trim(), objectif_operationnel: obj.trim() || null },
      });
      toast({ title: `✅ Activité ${code} mise à jour avec succès` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
    if (e.key === "Enter" && !e.shiftKey && e.currentTarget.tagName !== "TEXTAREA") { e.preventDefault(); handleSave(); }
    if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSave(); }
  };

  return (
    <div className="bg-background border-2 border-primary rounded-lg p-4 space-y-3 mx-2 my-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Pencil className="h-4 w-4" /> Modification — Activité {code}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm text-muted-foreground">Libellé *</Label>
          <span className={`text-xs ${lib.length > 280 ? (lib.length > 295 ? "text-destructive" : "text-amber-500") : "text-muted-foreground"}`}>
            {lib.length}/300
          </span>
        </div>
        <Input ref={inputRef} value={lib} onChange={(e) => setLib(e.target.value)} onKeyDown={handleKeyDown}
          className={`font-semibold ${libError ? "border-destructive" : "border-primary"}`} maxLength={301} />
        {libError && <p className="text-xs text-destructive">{libError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm text-muted-foreground">Objectif opérationnel</Label>
          <span className={`text-xs ${obj.length > 480 ? "text-destructive" : "text-muted-foreground"}`}>{obj.length}/500</span>
        </div>
        <Textarea value={obj} onChange={(e) => setObj(e.target.value)} onKeyDown={handleKeyDown}
          className="border-primary" rows={2} maxLength={501} />
      </div>

      <EditHistory entite="activite" code={code} />

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={handleCancel}>✕ Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
        </Button>
      </div>

      <ConfirmDialog open={showConfirm} onOpenChange={setShowConfirm}
        title="⚠️ Modifications non enregistrées"
        description="Vous avez modifié ce libellé sans enregistrer. Quitter quand même ?"
        onConfirm={onCancel} />
    </div>
  );
};

export default InlineEditActivite;
