import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CritereStatusBadge } from "./CritereStatusBadge";

interface Props {
  critere: any;
  canEdit: boolean;
  onSave: () => void;
}

function computeStatut(produit: boolean, avecEcart: boolean, obs: string): string {
  if (avecEcart && obs.trim()) return "produit_avec_ecart";
  if (produit) return "produit_conforme";
  return "non_produit";
}

export default function CritereBinaire({ critere, canEdit, onSave }: Props) {
  const [produit, setProduit] = useState(critere.valide_manuellement ?? false);
  const [avecEcart, setAvecEcart] = useState(critere.produit_avec_ecart ?? false);
  const [obs, setObs] = useState(critere.observation_ecart ?? "");
  const [saving, setSaving] = useState(false);

  const previewStatut = computeStatut(produit, avecEcart, obs);
  const saveDisabled = avecEcart && !obs.trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("extrants_criteres").update({
        valide_manuellement: produit,
        produit_avec_ecart: avecEcart,
        observation_ecart: obs.trim() || null,
      }).eq("id", critere.id);
      if (error) throw error;
      toast.success("✅ Critère enregistré");
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={produit}
          onCheckedChange={(checked) => {
            setProduit(!!checked);
            if (!checked) setAvecEcart(false);
          }}
          disabled={!canEdit}
        />
        <span className="text-sm font-semibold text-foreground">Action réalisée (produite)</span>
      </div>

      {produit && (
        <div className="ml-7 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={avecEcart}
              onCheckedChange={(checked) => setAvecEcart(!!checked)}
              disabled={!canEdit}
            />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              ⚠️ Produit avec écart constaté
            </span>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-400 ml-6">
            Cochez si le livrable existe mais présente une anomalie ou déviation par rapport aux attentes initiales.
          </p>
        </div>
      )}

      <CritereStatusBadge statut={previewStatut} />

      <div className="space-y-1">
        <Label className="text-sm">
          Observations / Justification
          {avecEcart && <span className="text-destructive ml-1">* (obligatoire si écart coché)</span>}
        </Label>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder={avecEcart ? "Décrivez l'écart constaté — pour mémoire et planification future" : "Note complémentaire optionnelle"}
          className={avecEcart && !obs.trim() ? "border-destructive" : ""}
        />
        {avecEcart && !obs.trim() && (
          <p className="text-xs text-destructive">⚠️ Une justification est requise lorsqu'un écart est coché.</p>
        )}
      </div>

      {canEdit && (
        <Button size="sm" onClick={handleSave} disabled={saving || saveDisabled}>
          {saving ? "⏳ Enregistrement..." : "💾 Enregistrer"}
        </Button>
      )}
    </div>
  );
}
