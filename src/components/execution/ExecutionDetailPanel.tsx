import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import type { PtaActivite, PtaTache } from "@/hooks/usePtaData";
import { getPalierLabel, getPalierColor, useAvancementHistory } from "@/hooks/useAvancementRules";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

interface PendingChange {
  avancement_pct: number;
  montant_realise: number;
  statut: string;
  observations: string;
}

interface ExecutionDetailPanelProps {
  sousTache: SousTache | null;
  parentTache: PtaTache | null;
  parentActivite: PtaActivite | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  pending: PendingChange | null;
  onChangePending: (stId: string, change: Partial<PendingChange>) => void;
  onSaveSingle: (stId: string) => void;
}

const statutLabels: Record<string, string> = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  termine: "Terminé",
  suspendu: "Suspendu",
  annule: "Annulé",
};

const ExecutionDetailPanel = ({
  sousTache,
  parentTache,
  parentActivite,
  open,
  onClose,
  canEdit,
  pending,
  onChangePending,
  onSaveSingle,
}: ExecutionDetailPanelProps) => {
  const { data: history = [] } = useAvancementHistory(sousTache?.id ?? null);

  if (!sousTache) return null;

  const p = pending ?? {
    avancement_pct: 0,
    montant_realise: 0,
    statut: "non_demarre",
    observations: "",
  };

  const budgetPrevu = sousTache.budget_prevu ?? 0;
  const tauxExec = budgetPrevu > 0 ? Math.round((p.montant_realise / budgetPrevu) * 100) : 0;

  const readOnlyFields = [
    { label: "Code", value: sousTache.code },
    { label: "Libellé complet", value: sousTache.libelle },
    { label: "Tâche parente", value: parentTache ? `${parentTache.code} — ${parentTache.libelle}` : "—" },
    { label: "Activité parente", value: parentActivite ? `${parentActivite.code} — ${parentActivite.libelle}` : "—" },
    { label: "Budget prévu (FCFA)", value: budgetPrevu ? budgetPrevu.toLocaleString("fr-FR") + " FCFA" : "—" },
    { label: "Lignes budgétaires", value: sousTache.lignes_budgetaires ?? "—" },
    { label: "Mode d'exécution", value: sousTache.mode_execution ?? "—" },
    { label: "Sources de financement", value: sousTache.sources_financement ?? "—" },
    { label: "Responsable", value: sousTache.responsable ?? "—" },
    { label: "Ressources humaines", value: sousTache.ressources_humaines ?? "—" },
  ];

  const trimestres = [
    { key: "trimestre_t1" as const, label: "T1" },
    { key: "trimestre_t2" as const, label: "T2" },
    { key: "trimestre_t3" as const, label: "T3" },
    { key: "trimestre_t4" as const, label: "T4" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground text-base">
            {sousTache.code} — Détail & Exécution
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Planning fields */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Planification
            </h4>
            {readOnlyFields.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}

            <div className="rounded p-3 bg-warning/30">
              <p className="text-xs text-warning-foreground font-semibold">Risques</p>
              <p className="text-sm text-warning-foreground">{sousTache.risques ?? "Aucun risque identifié"}</p>
            </div>

            <div className="rounded p-3 bg-success/30">
              <p className="text-xs text-success-foreground font-semibold">Mesures d'atténuation</p>
              <p className="text-sm text-success-foreground">{sousTache.mesures_attenuation ?? "—"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Trimestres programmés</p>
              <div className="flex gap-2">
                {trimestres.map(({ key, label }) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={sousTache[key] ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Execution fields */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Exécution
            </h4>

            <div className="space-y-2">
              <Label className="text-sm">Avancement (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[p.avancement_pct]}
                  onValueChange={([v]) => canEdit && onChangePending(sousTache.id, { avancement_pct: v })}
                  min={0}
                  max={100}
                  step={25}
                  disabled={!canEdit}
                  className="flex-1"
                />
                <Badge className={getPalierColor(p.avancement_pct)}>
                  {p.avancement_pct}% — {getPalierLabel(p.avancement_pct)}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1.5">
                Montant réalisé (FCFA) <span className="text-muted-foreground">🔒</span>
              </Label>
              <div className="h-9 flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                {(p.montant_realise || 0).toLocaleString("fr-FR")} FCFA
              </div>
              <p className="text-xs text-muted-foreground">
                Calculé automatiquement depuis les lignes budgétaires
              </p>
              <p className="text-xs text-muted-foreground">
                Taux d'exécution budgétaire : <span className="font-semibold">{tauxExec}%</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Statut</Label>
              <Select
                value={p.statut}
                onValueChange={(v) => canEdit && onChangePending(sousTache.id, { statut: v })}
                disabled={!canEdit}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statutLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Observations</Label>
              <Textarea
                value={p.observations}
                onChange={(e) => canEdit && onChangePending(sousTache.id, { observations: e.target.value })}
                disabled={!canEdit}
                rows={3}
              />
            </div>

            {canEdit && (
              <Button size="sm" onClick={() => onSaveSingle(sousTache.id)}>
                Sauvegarder
              </Button>
            )}
          </div>

          {/* Avancement history */}
          {history.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                📈 Historique de l'avancement
              </h4>
              <div className="space-y-1.5">
                {history.map((entry) => {
                  const av = entry.ancienne_valeur as any;
                  const nv = entry.nouvelle_valeur as any;
                  const oldPct = av?.avancement_pct;
                  const newPct = nv?.avancement_pct;
                  if (oldPct === undefined && newPct === undefined) return null;
                  const dateStr = format(new Date(entry.created_at), "dd/MM/yyyy", { locale: fr });
                  return (
                    <div key={entry.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {oldPct ?? 0}% → {newPct ?? 0}%
                      </Badge>
                      <span>{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExecutionDetailPanel;
