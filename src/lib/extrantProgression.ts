export interface CritereForProgression {
  type_critere: string;
  statut_critere: string;
  valeur_realisee: number | null;
  seuil_valeur: number | null;
}

export function getCritereProgression(critere: CritereForProgression): number {
  const statut = critere.statut_critere ?? "non_produit";

  if (critere.type_critere === "quantitatif") {
    const val = critere.valeur_realisee ?? 0;
    const seuil = critere.seuil_valeur ?? 0;
    if (seuil <= 0) {
      return statut === "produit_conforme" ? 100
        : statut === "produit_avec_ecart" ? 50
        : statut === "en_cours" ? 25
        : 0;
    }
    return Math.min(Math.round((val / seuil) * 100), 100);
  }

  switch (statut) {
    case "produit_conforme": return 100;
    case "produit_avec_ecart": return 75;
    case "en_cours": return 40;
    case "non_produit":
    default: return 0;
  }
}

export function getExtrantProgression(criteres: CritereForProgression[]): number {
  if (!criteres || criteres.length === 0) return 0;
  const total = criteres.reduce((sum, c) => sum + getCritereProgression(c), 0);
  return Math.round(total / criteres.length);
}

export function getProgressionColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 67) return { bar: "hsl(var(--success))", text: "text-success-foreground", bg: "bg-success/10" };
  if (pct >= 33) return { bar: "hsl(var(--warning))", text: "text-warning-foreground", bg: "bg-warning/10" };
  return { bar: "hsl(var(--destructive))", text: "text-destructive", bg: "bg-destructive/10" };
}

export function getProgressionColorRgb(pct: number): [number, number, number] {
  if (pct >= 67) return [21, 128, 61];
  if (pct >= 33) return [180, 83, 9];
  return [220, 38, 38];
}
