import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, Award, Trophy, Shield } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface TextKpiInfo {
  realized: string | null;
  target: string | null;
}

interface ExtrantStatsInfo {
  total: number;
  produits: number;
  enCours: number;
  nonProduits: number;
  taux: number;
}

interface KpiCardsProps {
  apprenants: { realized: number; target: number };
  budgetExec: number;
  physicalProgress: number;
  isoConformity: number;
  trainairPlus?: TextKpiInfo;
  centreAvsec?: TextKpiInfo;
  extrantStats?: ExtrantStatsInfo;
}

function gaugeData(pct: number) {
  return [
    { name: "val", value: Math.min(pct, 100) },
    { name: "rest", value: Math.max(100 - pct, 0) },
  ];
}

function gaugeColor(pct: number): string {
  if (pct >= 80) return "hsl(120, 26%, 55%)";
  if (pct >= 50) return "hsl(35, 90%, 55%)";
  return "hsl(0, 70%, 55%)";
}

function getTextStatus(realized: string | null, target: string | null): { label: string; emoji: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (!realized) return { label: "Non renseigné", emoji: "⭕", variant: "outline" };
  if (target && realized.trim().toLowerCase() === target.trim().toLowerCase())
    return { label: "Atteint", emoji: "✅", variant: "default" };
  return { label: "En cours", emoji: "⚠️", variant: "secondary" };
}

const DashboardKpiCards = ({ apprenants, budgetExec, physicalProgress, isoConformity, trainairPlus, centreAvsec }: KpiCardsProps) => {
  const trainairStatus = getTextStatus(trainairPlus?.realized ?? null, trainairPlus?.target ?? null);
  const avsecStatus = getTextStatus(centreAvsec?.realized ?? null, centreAvsec?.target ?? null);

  return (
    <div className="space-y-4">
      {/* Row 1: Main numeric KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Apprenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Apprenants formés
            </CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-foreground">
              {apprenants.realized.toLocaleString("fr-FR")}
            </div>
            <Progress
              value={apprenants.target > 0 ? (apprenants.realized / apprenants.target) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Cible 2026 : {apprenants.target.toLocaleString("fr-FR")}
            </p>
          </CardContent>
        </Card>

        {/* Card 2 — Budget execution gauge */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exécution budgétaire
            </CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-1">
            <div className="relative w-28 h-16">
              <ResponsiveContainer width="100%" height={64}>
                <PieChart>
                  <Pie
                    data={gaugeData(budgetExec)}
                    startAngle={180}
                    endAngle={0}
                    cx="50%"
                    cy="100%"
                    innerRadius={35}
                    outerRadius={50}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={gaugeColor(budgetExec)} />
                    <Cell fill="hsl(210, 20%, 92%)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-0 text-center">
                <span className="text-xl font-bold text-foreground">{budgetExec}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Physical progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Réalisation physique
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-foreground">{physicalProgress}%</div>
            <Progress value={physicalProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Moyenne sur toutes les sous-tâches
            </p>
          </CardContent>
        </Card>

        {/* Card 4 — ISO */}
        <Card className="border-success/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conformité ISO
            </CardTitle>
            <Award className="h-4 w-4 text-success-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-foreground">{isoConformity}%</div>
            <Progress value={isoConformity} className="h-2" />
            <p className="text-xs text-muted-foreground">Cible 2026 : 82,5%</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Text-based accreditation KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TRAINAIR PLUS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🏆 Accréditation TRAINAIR PLUS
            </CardTitle>
            <Trophy className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {trainairPlus?.realized ?? "Non renseigné"}
              </span>
              <Badge variant={trainairStatus.variant} className="text-xs">
                {trainairStatus.emoji} {trainairStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cible 2027 : {trainairPlus?.target ?? "Gold Member"}
            </p>
          </CardContent>
        </Card>

        {/* Centre AVSEC */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🛡️ Centre AVSEC OACI
            </CardTitle>
            <Shield className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {centreAvsec?.realized ?? "Non renseigné"}
              </span>
              <Badge variant={avsecStatus.variant} className="text-xs">
                {avsecStatus.emoji} {avsecStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cible 2027 : {centreAvsec?.target ?? "Centre AVSEC"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardKpiCards;
