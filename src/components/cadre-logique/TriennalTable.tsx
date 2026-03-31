import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

type KPI = Database["public"]["Tables"]["indicateurs_kpi"]["Row"];

interface TriennalTableProps {
  kpis: KPI[];
}

function parseNumeric(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function isTextBasedKpi(code: string): boolean {
  return code === "OS2-IND1" || code === "OS2-IND2";
}

function getCellClass(kpi: KPI, realized: string | null, target: string | null): string {
  if (isTextBasedKpi(kpi.code)) {
    if (!realized) return "";
    if (realized.trim().toLowerCase() === (target ?? "").trim().toLowerCase())
      return "bg-success text-success-foreground font-medium";
    return "bg-warning/30 text-warning-foreground";
  }
  const r = parseNumeric(realized);
  const t = parseNumeric(target);
  if (r === null || t === null || t === 0) return "";
  const pct = (r / t) * 100;
  if (pct >= 100) return "bg-success text-success-foreground font-medium";
  if (pct < 80) return "bg-destructive/10 text-destructive font-medium";
  return "bg-warning/30 text-warning-foreground";
}

const TriennalTable = ({ kpis }: TriennalTableProps) => (
  <div className="space-y-3">
    <h3 className="text-lg font-semibold text-foreground">
      Tableau des Cibles Triennales
    </h3>
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className="text-primary-foreground font-semibold">Indicateur</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Baseline</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Cible 2025</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Cible 2026</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Cible 2027</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Réalisé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.map((kpi, i) => {
            const currentYear = new Date().getFullYear();
            const currentTarget =
              currentYear === 2025 ? kpi.cible_2025 :
              currentYear === 2026 ? kpi.cible_2026 :
              currentYear === 2027 ? kpi.cible_2027 : kpi.cible_2025;

            return (
              <TableRow key={kpi.id} className={i % 2 === 0 ? "bg-light-blue" : "bg-light-blue-row"}>
                <TableCell className="font-medium text-foreground max-w-xs">
                  <div>
                    <span className="text-xs text-muted-foreground">{kpi.code}</span>
                    <p className="text-sm leading-tight">{kpi.libelle}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">{kpi.baseline_valeur ?? "—"}</TableCell>
                <TableCell className="text-center text-sm">{kpi.cible_2025 ?? "—"}</TableCell>
                <TableCell className="text-center text-sm">{kpi.cible_2026 ?? "—"}</TableCell>
                <TableCell className="text-center text-sm">{kpi.cible_2027 ?? "—"}</TableCell>
                <TableCell className={`text-center text-sm ${getCellClass(kpi, kpi.valeur_realisee, currentTarget)}`}>
                  {kpi.valeur_realisee ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default TriennalTable;
