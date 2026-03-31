import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Check, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type KPI = Database["public"]["Tables"]["indicateurs_kpi"]["Row"];

interface KpiCardsProps {
  kpis: KPI[];
  isAdmin: boolean;
  onUpdate: () => void;
}

const categoryColors: Record<string, string> = {
  "Objectif Spécifique 1": "bg-secondary text-secondary-foreground",
  "Objectif Spécifique 2": "bg-accent text-accent-foreground",
};

const tooltips: Record<string, string> = {
  "OS1-IND1": "Nombre total d'apprenants ayant suivi une formation complète. Calculé automatiquement depuis les exécutions.",
  "OS2-IND1": "Niveau d'accréditation OACI TRAINAIR PLUS de l'EFO.",
  "OS2-IND2": "Statut de certification Centre AVSEC OACI de l'EFO.",
  "OS2-IND3": "Pourcentage de conformité aux normes ISO 9001/21001. Calculé depuis les audits.",
};

function parseNumeric(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function isTextBasedKpi(code: string): boolean {
  return code === "OS2-IND1" || code === "OS2-IND2";
}

function getProgressPct(realized: string | null, target: string | null): number | null {
  const r = parseNumeric(realized);
  const t = parseNumeric(target);
  if (r === null || t === null || t === 0) return null;
  return Math.min(Math.round((r / t) * 100), 100);
}

function getStatus(kpi: KPI, target: string | null): "atteint" | "en_cours" | "non_atteint" {
  if (isTextBasedKpi(kpi.code)) {
    if (!kpi.valeur_realisee) return "non_atteint";
    if (kpi.valeur_realisee.trim().toLowerCase() === (target ?? "").trim().toLowerCase()) return "atteint";
    return "en_cours";
  }
  const pct = getProgressPct(kpi.valeur_realisee, target);
  if (pct === null) return "en_cours";
  if (pct >= 100) return "atteint";
  if (pct >= 50) return "en_cours";
  return "non_atteint";
}

const statusConfig = {
  atteint: { label: "Atteint", icon: Check, className: "bg-success text-success-foreground" },
  en_cours: { label: "En cours", icon: Clock, className: "bg-warning text-warning-foreground" },
  non_atteint: { label: "Non atteint", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const currentYear = new Date().getFullYear();

function getCurrentTarget(kpi: KPI): string | null {
  if (currentYear === 2025) return kpi.cible_2025;
  if (currentYear === 2026) return kpi.cible_2026;
  if (currentYear === 2027) return kpi.cible_2027;
  return kpi.cible_2025;
}

const KpiCards = ({ kpis, isAdmin, onUpdate }: KpiCardsProps) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleSave = async (kpi: KPI) => {
    const { error } = await supabase
      .from("indicateurs_kpi")
      .update({ valeur_realisee: editValue, updated_at: new Date().toISOString() })
      .eq("id", kpi.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour la valeur.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Valeur réalisée mise à jour." });
      onUpdate();
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        Indicateurs Clés de Performance (KPI)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map((kpi) => {
          const target = getCurrentTarget(kpi);
          const status = getStatus(kpi, target);
          const isText = isTextBasedKpi(kpi.code);
          const pct = isText ? null : getProgressPct(kpi.valeur_realisee, target);
          const cfg = statusConfig[status];
          const StatusIcon = cfg.icon;

          return (
            <Card key={kpi.id} className="overflow-hidden">
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={categoryColors[kpi.categorie ?? ""] ?? "bg-muted text-muted-foreground"}>
                    {kpi.categorie}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{tooltips[kpi.code] ?? "Indicateur de performance"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {kpi.libelle}
                </p>
                <p className="text-xs text-muted-foreground">
                  Code : {kpi.code} · {kpi.mode_calcul === "auto" ? "Calcul automatique" : "Saisie manuelle"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded bg-muted p-2">
                    <p className="text-xs text-muted-foreground">Baseline {kpi.baseline_annee}</p>
                    <p className="font-semibold text-foreground">{kpi.baseline_valeur ?? "—"}</p>
                  </div>
                  <div className="rounded bg-secondary/20 border border-secondary p-2">
                    <p className="text-xs text-secondary">Cible {currentYear}</p>
                    <p className="font-semibold text-secondary">{target ?? "—"}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Réalisé</span>
                    {isAdmin && editingId !== kpi.id ? (
                      <button
                        onClick={() => { setEditingId(kpi.id); setEditValue(kpi.valeur_realisee ?? ""); }}
                        className="text-xs text-secondary underline hover:text-secondary/80"
                      >
                        Modifier
                      </button>
                    ) : null}
                  </div>
                  {editingId === kpi.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        placeholder={isText ? "Ex: Gold Member" : "Valeur réalisée"}
                      />
                      <button onClick={() => handleSave(kpi)} className="text-xs bg-primary text-primary-foreground px-3 rounded hover:bg-primary/90">
                        OK
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{kpi.valeur_realisee ?? "Non renseigné"}</p>
                      {isText && kpi.valeur_realisee && target && (
                        <span className="text-xs">
                          {kpi.valeur_realisee.trim().toLowerCase() === target.trim().toLowerCase()
                            ? "✅"
                            : "⚠️"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {pct !== null && (
                  <div className="space-y-1">
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{pct}%</p>
                  </div>
                )}

                {isText && target && (
                  <p className="text-xs text-muted-foreground">
                    Comparaison : {kpi.valeur_realisee ?? "—"} vs Cible « {target} »
                  </p>
                )}

                <Badge variant="outline" className={cfg.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default KpiCards;
