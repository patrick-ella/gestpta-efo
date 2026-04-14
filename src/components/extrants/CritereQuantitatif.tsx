import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CritereStatusBadge } from "./CritereStatusBadge";

interface Props {
  critere: any;
  canEdit: boolean;
  onSave: () => void;
}

function computeStatut(valeur: number | null, seuil: number, obs: string): string {
  if (!valeur || valeur <= 0) return "non_produit";
  if (valeur >= seuil) return "produit_conforme";
  if (obs.trim()) return "produit_avec_ecart";
  return "en_cours";
}

export default function CritereQuantitatif({ critere, canEdit, onSave }: Props) {
  const [valeur, setValeur] = useState(critere.valeur_realisee?.toString() ?? "");
  const [obs, setObs] = useState(critere.observation_ecart ?? "");
  const [saving, setSaving] = useState(false);

  const seuil = critere.seuil_valeur ?? 0;
  const numValeur = Number(valeur) || 0;
  const pct = seuil > 0 ? Math.min(Math.round((numValeur / seuil) * 100), 100) : 0;
  const previewStatut = computeStatut(numValeur > 0 ? numValeur : null, seuil, obs);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("extrants_criteres").update({
        valeur_realisee: numValeur > 0 ? numValeur : null,
        observation_ecart: obs.trim() || null,
      }).eq("id", critere.id);
      if (error) throw error;
      toast.success("✅ Progression enregistrée");
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="text-sm text-muted-foreground">
        Seuil cible : <strong className="text-primary">{seuil} {critere.seuil_unite || ""}</strong>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Valeur réalisée à date *</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            disabled={!canEdit}
            className="w-28 text-center font-bold"
          />
          <span className="text-sm text-muted-foreground">{critere.seuil_unite || "unités"}</span>
        </div>
      </div>

      {seuil > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{numValeur} / {seuil} {critere.seuil_unite || ""}</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
      )}

      <CritereStatusBadge statut={previewStatut} />

      <div className="space-y-1">
        <Label className="text-sm">
          Observations / Justification de l'écart
          {previewStatut === "produit_avec_ecart" && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="Précisez pourquoi le seuil n'est pas encore atteint — pour mémoire et planification future"
        />
        <p className="text-xs text-muted-foreground italic">
          Cette note est conservée même après atteinte du seuil, pour référence future.
        </p>
      </div>

      {canEdit && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "⏳ Enregistrement..." : "💾 Enregistrer la progression"}
        </Button>
      )}
    </div>
  );
}
