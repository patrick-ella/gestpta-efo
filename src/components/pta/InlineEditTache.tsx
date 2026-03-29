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
import { Pencil, Save, Info } from "lucide-react";

interface Props {
  id: string;
  code: string;
  libelle: string;
  livrables: string | null;
  budgetTotal: number;
  onSaved: () => void;
  onCancel: () => void;
}

const InlineEditTache = ({ id, code, libelle, livrables, budgetTotal, onSaved, onCancel }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lib, setLib] = useState(libelle);
  const [livr, setLivr] = useState(livrables ?? "");
  const [budget, setBudget] = useState(budgetTotal);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [minBudget, setMinBudget] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch minimum allowed budget (sum of all ST lines for this tache)
  useEffect(() => {
    const fetchMin = async () => {
      const { data: sts } = await supabase.from("sous_taches").select("id").eq("tache_id", id);
      if (!sts || sts.length === 0) { setMinBudget(0); return; }
      const stIds = sts.map(s => s.id);
      const { data: lines } = await supabase
        .from("sous_tache_lignes_budgetaires")
        .select("montant_prevu")
        .in("sous_tache_id", stIds);
      const total = (lines ?? []).reduce((s, l) => s + (l.montant_prevu ?? 0), 0);
      setMinBudget(total);
    };
    fetchMin();
  }, [id]);

  const hasChanges = lib !== libelle || livr !== (livrables ?? "") || budget !== budgetTotal;
  const libError = lib.trim().length < 5 ? "Minimum 5 caractères requis" : lib.length > 300 ? "Maximum 300 caractères" : null;
  const budgetError = budget < minBudget
    ? `⛔ Le plafond saisi (${budget.toLocaleString("fr-FR")} FCFA) est inférieur au total déjà ventilé sur les sous-tâches (${minBudget.toLocaleString("fr-FR")} FCFA).`
    : null;
  const canSave = !libError && !budgetError && hasChanges && budget >= 0;

  const handleCancel = () => {
    if (hasChanges) { setShowConfirm(true); } else { onCancel(); }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("taches").update({
        libelle: lib.trim(),
        livrables: livr.trim() || null,
        budget_total: budget,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("journal_audit").insert({
        user_id: user!.id, action: "UPDATE", entite: "tache",
        ancienne_valeur: { reference: code, libelle, livrables, budget_total: budgetTotal },
        nouvelle_valeur: { reference: code, libelle: lib.trim(), livrables: livr.trim() || null, budget_total: budget },
      });
      toast({ title: `✅ Tâche ${code} mise à jour — Budget : ${budget.toLocaleString("fr-FR")} FCFA` });
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
    <div className="bg-background border-2 border-secondary rounded-lg p-4 space-y-3 mx-4 my-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
        <Pencil className="h-4 w-4" /> Modification — Tâche {code}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm text-muted-foreground">Libellé *</Label>
          <span className={`text-xs ${lib.length > 280 ? (lib.length > 295 ? "text-destructive" : "text-amber-500") : "text-muted-foreground"}`}>
            {lib.length}/300
          </span>
        </div>
        <Input ref={inputRef} value={lib} onChange={(e) => setLib(e.target.value)} onKeyDown={handleKeyDown}
          className={`font-semibold ${libError ? "border-destructive" : "border-secondary"}`} maxLength={301} />
        {libError && <p className="text-xs text-destructive">{libError}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-sm text-muted-foreground">Livrables attendus</Label>
          <span className={`text-xs ${livr.length > 950 ? "text-destructive" : "text-muted-foreground"}`}>{livr.length}/1000</span>
        </div>
        <Textarea value={livr} onChange={(e) => setLivr(e.target.value)} onKeyDown={handleKeyDown}
          className="border-secondary" rows={4} maxLength={1001}
          placeholder="Un livrable attendu par ligne&#10;ex: Rapport mensuel validé" />
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3 w-3" /> Saisissez un livrable par ligne.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-muted-foreground">💰 Budget prévu — plafond de la tâche (FCFA)</Label>
        <Input
          type="number"
          value={budget}
          min={0}
          onChange={(e) => setBudget(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          className={budgetError ? "border-destructive" : "border-secondary"}
        />
        {budgetError && <p className="text-xs text-destructive">{budgetError}</p>}
        <p className="text-xs text-muted-foreground italic">
          ℹ️ Ce montant est le plafond budgétaire. La somme des lignes prévues de ses sous-tâches ne doit pas le dépasser.
        </p>
        {minBudget > 0 && (
          <p className="text-xs text-muted-foreground">
            Ventilé sur sous-tâches : {minBudget.toLocaleString("fr-FR")} FCFA — Valeur minimale autorisée
          </p>
        )}
      </div>

      <EditHistory entite="tache" code={code} />

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

export default InlineEditTache;
