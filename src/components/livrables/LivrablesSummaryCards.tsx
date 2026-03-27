import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, FileText, TrendingUp } from "lucide-react";
import type { ActiviteGrouped } from "@/hooks/useLivrablesData";

interface Props {
  data: ActiviteGrouped[];
}

export const LivrablesSummaryCards = ({ data }: Props) => {
  const allLivrables = data.flatMap((a) => a.taches.flatMap((t) => t.livrables));
  const total = allLivrables.length;
  const produits = allLivrables.filter((l) => l.produit).length;
  const enAttente = total - produits;
  const taux = total > 0 ? Math.round((produits / total) * 100) : 0;

  const cards = [
    {
      label: "Total livrables attendus",
      value: total,
      icon: FileText,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      label: "Livrables produits",
      value: produits,
      icon: CheckCircle,
      color: "text-success-foreground",
      bg: "bg-success",
    },
    {
      label: "Livrables en attente",
      value: enAttente,
      icon: Clock,
      color: "text-warning-foreground",
      bg: "bg-warning",
    },
    {
      label: "Taux de production",
      value: `${taux}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-accent",
      progress: taux,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            {c.progress !== undefined && (
              <Progress value={c.progress} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
