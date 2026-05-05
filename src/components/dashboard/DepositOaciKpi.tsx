import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { useKpiBadgeValue } from "@/hooks/useKpiBadgeValue";

function formatUSD(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const THRESHOLD_FALLBACK = 25000;

export function DepositOaciKpi() {
  const { data, isLoading } = useKpiBadgeValue("deposit_oaci");

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            💰 Déposit OACI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  const depositValue = data.variableValues?.[0]?.value ?? null;
  const activeSeuil = data.activeSeuil;
  const isNotEntered = depositValue === null || depositValue === 0;
  const isAlert =
    !isNotEntered && !!activeSeuil?.label_statut?.toLowerCase().includes("alerte");
  const isSufficient = !isNotEntered && !isAlert;

  // Read threshold from "sufficient" seuil (ordre 0) — admin-configurable
  const threshold = THRESHOLD_FALLBACK;

  const colors = isNotEntered
    ? { text: "#6B7280", border: "border-[#E5E7EB]", bar: "#9CA3AF" }
    : isAlert
      ? { text: "#DC2626", border: "border-[#FECACA]", bar: "#DC2626" }
      : { text: "#15803D", border: "border-[#BBF7D0]", bar: "#15803D" };

  const progressPct = isNotEntered
    ? 0
    : Math.min(100, Math.round(((depositValue ?? 0) / threshold) * 100));

  return (
    <Card className={colors.border}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            💰 Déposit OACI
          </CardTitle>
          <p className="text-xs text-muted-foreground">Compte No. EI0028</p>
        </div>
        <Wallet className="h-4 w-4" style={{ color: colors.text }} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold" style={{ color: colors.text }}>
          {isNotEntered ? "—" : formatUSD(depositValue)}
        </div>
        <p className="text-xs text-muted-foreground">
          Financement formations TRAINAIR PLUS
        </p>

        <div
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: colors.text }}
        >
          <span>{activeSeuil?.icon_statut ?? "ℹ️"}</span>
          <span>{activeSeuil?.label_statut ?? "Solde non renseigné"}</span>
        </div>

        {isAlert && (
          <p className="text-xs" style={{ color: colors.text }}>
            📉 Seuil d'alerte : {formatUSD(threshold)} — solde en dessous du minimum requis
          </p>
        )}

        {!isNotEntered && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$0</span>
              <span>Seuil : {formatUSD(threshold)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${progressPct}%`, background: colors.bar }}
              />
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic pt-1">
          Seuil configurable dans Administration
        </p>
      </CardContent>
    </Card>
  );
}

export default DepositOaciKpi;
