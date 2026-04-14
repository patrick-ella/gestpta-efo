import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CritereStatusBadge } from "./CritereStatusBadge";

interface Props {
  critere: any;
  canEdit: boolean;
  onSave: () => void;
}

function computeStatut(echeance: string | null, production: string | null): string {
  const today = new Date();
  const ech = echeance ? new Date(echeance) : null;
  const prod = production ? new Date(production) : null;

  if (prod) {
    return ech && prod > ech ? "produit_avec_ecart" : "produit_conforme";
  }
  if (!ech || today <= ech) return "en_cours";
  return "non_produit";
}

function getDelayDays(echeance: string | null, production: string | null): number | null {
  if (!echeance) return null;
  const ref = production ? new Date(production) : new Date();
  return Math.round((ref.getTime() - new Date(echeance).getTime()) / (1000 * 60 * 60 * 24));
}

export default function CritereDate({ critere, canEdit, onSave }: Props) {
  const [dateEffective, setDateEffective] = useState(critere.date_production_effective ?? "");
  const [obs, setObs] = useState(critere.observation_ecart ?? "");
  const [saving, setSaving] = useState(false);

  const echeance = critere.date_echeance;
  const previewStatut = computeStatut(echeance, dateEffective || null);
  const delayDays = getDelayDays(echeance, dateEffective || null);
  const isLate = delayDays !== null && delayDays > 0;
  const isProduced = !!dateEffective;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("extrants_criteres").update({
        date_production_effective: dateEffective || null,
        observation_ecart: obs.trim() || null,
      }).eq("id", critere.id);
      if (error) throw error;
      toast.success("✅ Date enregistrée");
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {echeance && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Date d'échéance :</span>
          <strong className="text-primary">{new Date(echeance).toLocaleDateString("fr-FR")}</strong>
          {!isProduced && isLate && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
              ⚠️ Dépassée de {delayDays} jours
            </Badge>
          )}
          {!isProduced && !isLate && (
            <Badge variant="outline" className="bg-success/10 text-success-foreground border-success/20 text-xs">
              ✓ Dans les délais
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-sm">Date de production effective</Label>
        <Input
          type="date"
          value={dateEffective}
          onChange={(e) => setDateEffective(e.target.value)}
          disabled={!canEdit}
        />
        <p className="text-xs text-muted-foreground italic">
          Saisissez la date réelle de production, même si postérieure à l'échéance prévue.
        </p>
      </div>

      {isProduced && isLate && (
        <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 text-sm text-purple-700 dark:text-purple-300">
          ⚠️ Produit avec <strong>{delayDays} jours de retard</strong> par rapport à l'échéance
        </div>
      )}

      {isProduced && !isLate && (
        <div className="p-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          ✓ Produit dans les délais prévus
        </div>
      )}

      <CritereStatusBadge statut={previewStatut} />

      <div className="space-y-1">
        <Label className="text-sm">
          Observations / Justification du retard
          {previewStatut === "produit_avec_ecart" && (
            <span className="text-purple-600 dark:text-purple-400 text-xs ml-1">(recommandé si retard constaté)</span>
          )}
        </Label>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder={isLate ? "Expliquez la cause du retard — pour mémoire et planification future" : "Note complémentaire optionnelle"}
        />
      </div>

      {canEdit && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "⏳ Enregistrement..." : "💾 Enregistrer"}
        </Button>
      )}
    </div>
  );
}
