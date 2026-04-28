import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Play, Loader2, Link2 } from "lucide-react";
import KpiConfigPanel from "./KpiConfigPanel";
import { useKpiBadgeValue } from "@/hooks/useKpiBadgeValue";

interface BadgeRow {
  id: string;
  code: string;
  label: string;
  description: string | null;
  icon: string | null;
  type_calcul: string;
  ordre: number | null;
  is_active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  seuils: "Seuils progressifs",
  somme: "Somme de variables",
  moyenne: "Moyenne de variables",
  valeur: "Valeur directe",
};

function BadgePreview({ code }: { code: string }) {
  const { data, isLoading } = useKpiBadgeValue(code);
  if (isLoading) return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (!data) return null;
  if (data.activeSeuil) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
        style={{
          background: data.activeSeuil.bg_couleur ?? undefined,
          color: data.activeSeuil.couleur ?? undefined,
        }}
      >
        {data.activeSeuil.icon_statut} {data.activeSeuil.label_statut}
      </span>
    );
  }
  if (data.computed !== null) {
    return (
      <span className="text-xs font-semibold text-foreground">
        Valeur actuelle : {data.computed}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Non configuré</span>;
}

export function AdminKpiConnexions() {
  const [selected, setSelected] = useState<BadgeRow | null>(null);

  const { data: badges = [], isLoading } = useQuery<BadgeRow[]>({
    queryKey: ["kpi_badges_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_badges" as any)
        .select("*")
        .order("ordre");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Connexions des indicateurs KPI
          </CardTitle>
          <CardDescription>
            Configurez quels critères d'extrants alimentent chaque badge du tableau de
            bord. Les indicateurs budgétaires (taux d'engagement, taux de réalisation)
            sont exclus — ils restent calculés automatiquement à partir des lignes
            budgétaires.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {badges.map((b) => (
            <Card key={b.id} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{b.icon}</span>
                  <span>{b.label}</span>
                </CardTitle>
                {b.description && (
                  <CardDescription className="text-xs">{b.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">
                    {TYPE_LABELS[b.type_calcul] ?? b.type_calcul}
                  </Badge>
                  <BadgePreview code={b.code} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => setSelected(b)} className="gap-1">
                    <Settings className="h-3.5 w-3.5" /> Configurer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(b)}
                    className="gap-1"
                  >
                    <Play className="h-3.5 w-3.5" /> Tester
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {badges.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-6">
              Aucun badge KPI défini.
            </p>
          )}
        </CardContent>
      </Card>

      {selected && (
        <KpiConfigPanel
          badge={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
