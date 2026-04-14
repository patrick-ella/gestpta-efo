import { Badge } from "@/components/ui/badge";

const STATUT_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  non_produit: { label: "Non produit", icon: "✗", className: "bg-destructive/10 text-destructive border-destructive/20" },
  en_cours: { label: "En cours", icon: "⏳", className: "bg-warning/10 text-warning-foreground border-warning/20" },
  produit_avec_ecart: { label: "Produit avec écart", icon: "⚠️", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300" },
  produit_conforme: { label: "Produit conforme", icon: "✓", className: "bg-success/10 text-success-foreground border-success/20" },
};

export function CritereStatusBadge({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[statut] ?? STATUT_CONFIG.non_produit;
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${config.className}`}>
      {config.icon} {config.label}
    </Badge>
  );
}

export function getStatutConfig() {
  return STATUT_CONFIG;
}
