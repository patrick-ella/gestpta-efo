import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActivityRow {
  id: string;
  code: string;
  libelle: string;
  budgetPrevu: number;
  budgetConsomme: number;
  tauxBudgetaire: number;
  avancementPhysique: number;
  extrantsProduits?: number;
  extrantsTotal?: number;
}

interface Props {
  activities: ActivityRow[];
}

function pctCellClass(pct: number): string {
  if (pct >= 90) return "bg-success text-success-foreground";
  if (pct >= 60) return "bg-warning text-warning-foreground";
  return "bg-destructive/10 text-destructive";
}

function formatFcfa(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString("fr-FR");
}

function statusLabel(pct: number): string {
  if (pct >= 90) return "En bonne voie";
  if (pct >= 60) return "Attention";
  if (pct > 0) return "En retard";
  return "Non démarré";
}

const statusColors: Record<string, string> = {
  "En bonne voie": "bg-success text-success-foreground",
  "Attention": "bg-warning text-warning-foreground",
  "En retard": "bg-destructive/10 text-destructive",
  "Non démarré": "bg-muted text-muted-foreground",
};

const ActivityMatrix = ({ activities }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className="text-primary-foreground font-semibold">Activité</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-right">Budget prévu</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-right">Budget consommé</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Taux budgétaire</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Avancement physique</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Extrants produits</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((act, i) => {
            const status = statusLabel(act.avancementPhysique);
            return (
              <TableRow
                key={act.id}
                className={`cursor-pointer hover:bg-accent/50 ${i % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row"}`}
                onClick={() => navigate("/execution")}
              >
                <TableCell className="font-medium text-foreground">
                  <span className="text-xs text-muted-foreground mr-2">{act.code}</span>
                  {act.libelle}
                </TableCell>
                <TableCell className="text-right text-sm">{formatFcfa(act.budgetPrevu)} FCFA</TableCell>
                <TableCell className="text-right text-sm">{formatFcfa(act.budgetConsomme)} FCFA</TableCell>
                <TableCell className="text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${pctCellClass(act.tauxBudgetaire)}`}>
                    {act.tauxBudgetaire}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${pctCellClass(act.avancementPhysique)}`}>
                    {act.avancementPhysique}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={statusColors[status]}>{status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActivityMatrix;
