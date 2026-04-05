import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Award, Trophy, Shield, TrendingDown, Banknote } from "lucide-react";

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

interface BudgetKpiInfo {
  totalPrevu: number;
  totalEngage: number;
  totalRealise: number;
  tauxEngagement: number;
  tauxRealisation: number;
}

interface KpiCardsProps {
  apprenants: { realized: number; target: number };
  physicalProgress: number;
  isoConformity: number;
  trainairPlus?: TextKpiInfo;
  centreAvsec?: TextKpiInfo;
  extrantStats?: ExtrantStatsInfo;
  budgetKpis?: BudgetKpiInfo;
}

function formatFCFA(amount: number): string {
  if (amount === 0) return "0 FCFA";
  const abs = Math.abs(amount);
  const str = abs.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return (amount < 0 ? "-" : "") + parts.join("\u00A0") + " FCFA";
}

function getTauxColor(taux: number, variant: "blue" | "green"): string {
  if (taux === 0) return "#9CA3AF";
  if (taux < 50) return "#EF4444";
  if (taux < 75) return "#F59E0B";
  if (taux < 100) return variant === "blue" ? "#3B82F6" : "#22C55E";
  if (taux === 100) return variant === "blue" ? "#1D4ED8" : "#15803D";
  return "#991B1B"; // > 100%
}

function getTextStatus(realized: string | null, target: string | null): { label: string; emoji: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (!realized) return { label: "Non renseigné", emoji: "⭕", variant: "outline" };
  if (target && realized.trim().toLowerCase() === target.trim().toLowerCase())
    return { label: "Atteint", emoji: "✅", variant: "default" };
  return { label: "En cours", emoji: "⚠️", variant: "secondary" };
}

const DashboardKpiCards = ({ apprenants, physicalProgress, isoConformity, trainairPlus, centreAvsec, extrantStats, budgetKpis }: KpiCardsProps) => {
  const trainairStatus = getTextStatus(trainairPlus?.realized ?? null, trainairPlus?.target ?? null);
  const avsecStatus = getTextStatus(centreAvsec?.realized ?? null, centreAvsec?.target ?? null);
  const extTaux = extrantStats?.taux ?? 0;

  const tauxEng = budgetKpis?.tauxEngagement ?? 0;
  const tauxReal = budgetKpis?.tauxRealisation ?? 0;
  const engColor = getTauxColor(tauxEng, "blue");
  const realColor = getTauxColor(tauxReal, "green");

  return (
    <div className="space-y-4">
      {/* Row 1: Main numeric KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        {/* Card 2 — Physical progress */}
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

        {/* Card 3 — Taux d'engagement (BLUE gauge) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🔵 Taux d'engagement budgétaire
            </CardTitle>
            <Banknote className="h-4 w-4" style={{ color: "#3B82F6" }} />
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <div className="relative">
              <HalfCircleGauge value={tauxEng} color="#3B82F6" />
              <div className="absolute inset-x-0 bottom-0 text-center">
                <span className="text-2xl font-bold" style={{ color: engColor }}>
                  {tauxEng}%
                </span>
                {tauxEng > 100 && <span className="ml-1">⚠️</span>}
              </div>
            </div>
            <div className="w-full mt-1 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Engagé : {formatFCFA(budgetKpis?.totalEngage ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Prévu : {formatFCFA(budgetKpis?.totalPrevu ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — Taux de réalisation (GREEN gauge) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🟢 Taux de réalisation budgétaire
            </CardTitle>
            <TrendingDown className="h-4 w-4" style={{ color: "#22C55E" }} />
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <div className="relative">
              <HalfCircleGauge value={tauxReal} color="#22C55E" />
              <div className="absolute inset-x-0 bottom-0 text-center">
                <span className="text-2xl font-bold" style={{ color: realColor }}>
                  {tauxReal}%
                </span>
                {tauxReal > 100 && <span className="ml-1">⚠️</span>}
              </div>
            </div>
            <div className="w-full mt-1 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Réalisé : {formatFCFA(budgetKpis?.totalRealise ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Prévu : {formatFCFA(budgetKpis?.totalPrevu ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5 — ISO */}
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

      {/* Row 2: Text-based accreditation KPIs + Extrants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Extrants KPI */}
        <Card className="border-success/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              📦 Production des extrants
            </CardTitle>
            <Award className="h-4 w-4 text-success-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-foreground">{extTaux}%</div>
            <Progress value={extTaux} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {extrantStats?.produits ?? 0}/{extrantStats?.total ?? 0} extrants produits ou validés
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardKpiCards;
