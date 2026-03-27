import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const defaultActivities = [
  { code: "30203001", libelle: "Formation initiale des pilotes et contrôleurs", objectif: "Former les apprenants aux métiers de l'aéronautique" },
  { code: "30203002", libelle: "Formation continue et perfectionnement", objectif: "Renforcer les compétences des professionnels en activité" },
  { code: "30203003", libelle: "Développement des curricula et certifications", objectif: "Mettre à jour les programmes de formation" },
  { code: "30203004", libelle: "Renforcement des infrastructures pédagogiques", objectif: "Moderniser les équipements et simulateurs" },
  { code: "30203005", libelle: "Partenariats et accréditations internationales", objectif: "Obtenir et maintenir les reconnaissances OACI" },
];

const ActivitiesSummary = () => {
  const { data: activites, isLoading } = useQuery({
    queryKey: ["activites-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activites")
        .select("id, code, libelle, objectif_operationnel, budget_total")
        .order("ordre");
      if (error) throw error;
      return data;
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["executions-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executions")
        .select("sous_tache_id, montant_realise, avancement_pct");
      if (error) throw error;
      return data;
    },
  });

  const displayActivities = activites && activites.length > 0
    ? activites.map((a) => ({
        code: a.code,
        libelle: a.libelle,
        objectif: a.objectif_operationnel ?? "",
        budget: a.budget_total ?? 0,
      }))
    : defaultActivities.map((a) => ({ ...a, budget: 0 }));

  const globalAvg = executions && executions.length > 0
    ? Math.round(executions.reduce((s, e) => s + (e.avancement_pct ?? 0), 0) / executions.length)
    : 0;

  const totalRealized = executions?.reduce((s, e) => s + (e.montant_realise ?? 0), 0) ?? 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Activités rattachées au Cadre Logique
        </h3>
        <Badge variant="outline" className="text-sm">
          Avancement moyen : {globalAvg}%
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayActivities.slice(0, 5).map((act, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-secondary text-secondary-foreground text-xs">
                  {act.code}
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold text-foreground leading-tight mt-1">
                {act.libelle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {act.objectif || "Objectif opérationnel non défini"}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Avancement</span>
                  <span>{globalAvg}%</span>
                </div>
                <Progress value={globalAvg} className="h-1.5" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Budget consommé</span>
                <span className="font-medium text-foreground">
                  {totalRealized > 0 ? `${(totalRealized / 1000000).toFixed(1)}M` : "0"} / {act.budget > 0 ? `${(act.budget / 1000000).toFixed(1)}M` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesSummary;
