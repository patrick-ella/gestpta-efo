import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSpreadsheet, FileText, Calendar, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchReportData } from "@/lib/reportUtils";
import { toast } from "sonner";
import RequirePermission from "@/components/auth/RequirePermission";
import { MODULES } from "@/lib/constants/modules";

type GeneratingState = Record<string, boolean>;

const RapportsContent = () => {
  const [annee, setAnnee] = useState("2026");
  const [mois, setMois] = useState("1");
  const [trimestre, setTrimestre] = useState("1");
  const [generating, setGenerating] = useState<GeneratingState>({});
  const [lastGenerated, setLastGenerated] = useState<Record<string, string>>({});

  const { data: exercices = [] } = useQuery({
    queryKey: ["exercices-rapports"],
    queryFn: async () => {
      const { data } = await supabase.from("exercices").select("*").order("annee");
      return data || [];
    },
  });

  const selectedExercice = exercices.find((e) => e.annee === parseInt(annee));

  const generate = async (reportKey: string, fn: () => Promise<void>) => {
    setGenerating((p) => ({ ...p, [reportKey]: true }));
    try {
      await fn();
      setLastGenerated((p) => ({ ...p, [reportKey]: new Date().toLocaleString("fr-FR") }));
      toast.success("Rapport généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du rapport.");
    } finally {
      setGenerating((p) => ({ ...p, [reportKey]: false }));
    }
  };

  const moisOptions = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  const [activiteFilter, setActiviteFilter] = useState<string>("all");

  const { data: activitesList = [] } = useQuery({
    queryKey: ["activites-rapports", selectedExercice?.id],
    queryFn: async () => {
      if (!selectedExercice) return [];
      const { data } = await supabase.from("activites").select("id, code, libelle").eq("exercice_id", selectedExercice.id).order("ordre");
      return data || [];
    },
    enabled: !!selectedExercice,
  });

  const reports = [
    {
      key: "pta",
      title: "Export PTA complet",
      desc: "Export Excel du PTA avec les 19 colonnes, formatage couleur par niveau hiérarchique.",
      icon: FileSpreadsheet,
      badge: "Excel",
      badgeClass: "bg-success text-success-foreground",
      params: null,
      action: async () => {
        const data = await fetchReportData(selectedExercice?.id);
        const { exportPtaExcel } = await import("@/lib/reports/exportPtaExcel");
        exportPtaExcel(data, parseInt(annee));
      },
    },
    {
      key: "mensuel",
      title: "Rapport mensuel d'activité de l'EFO",
      desc: "Rapport PDF avec exécution budgétaire par tâche et suivi des extrants (GAR) par activité.",
      icon: FileText,
      badge: "PDF",
      badgeClass: "bg-destructive text-destructive-foreground",
      params: "mensuel",
      action: async () => {
        const { generateRapportActivite } = await import("@/lib/reports/generateRapportActivite");
        await generateRapportActivite({
          type: "mensuel",
          exercice: parseInt(annee),
          mois: parseInt(mois),
          activiteId: activiteFilter !== "all" ? activiteFilter : undefined,
        });
      },
    },
    {
      key: "trimestriel",
      title: "Rapport trimestriel d'activité de l'EFO",
      desc: "Rapport PDF avec exécution budgétaire par tâche et suivi des extrants (GAR) par activité.",
      icon: FileText,
      badge: "PDF",
      badgeClass: "bg-destructive text-destructive-foreground",
      params: "trimestriel",
      action: async () => {
        const { generateRapportActivite } = await import("@/lib/reports/generateRapportActivite");
        await generateRapportActivite({
          type: "trimestriel",
          exercice: parseInt(annee),
          trimestre: parseInt(trimestre) as 1 | 2 | 3 | 4,
          activiteId: activiteFilter !== "all" ? activiteFilter : undefined,
        });
      },
    },
    {
      key: "budget",
      title: "Récapitulatif budgétaire",
      desc: "Export Excel groupé par activité avec sous-totaux et total général.",
      icon: FileSpreadsheet,
      badge: "Excel",
      badgeClass: "bg-success text-success-foreground",
      params: null,
      action: async () => {
        const data = await fetchReportData(selectedExercice?.id);
        const { exportBudgetExcel } = await import("@/lib/reports/exportBudgetExcel");
        exportBudgetExcel(data, parseInt(annee));
      },
    },
    {
      key: "calendrier",
      title: "Calendrier trimestriel",
      desc: "Export Excel des sous-tâches avec programmation T1-T4.",
      icon: Calendar,
      badge: "Excel",
      badgeClass: "bg-success text-success-foreground",
      params: null,
      action: async () => {
        const data = await fetchReportData(selectedExercice?.id);
        const { exportCalendrierExcel } = await import("@/lib/reports/exportCalendrierExcel");
        exportCalendrierExcel(data, parseInt(annee));
      },
    },
    {
      key: "budget-livrables",
      title: "Rapport d'activité de l'EFO",
      desc: "Exécution budgétaire par tâche et suivi des extrants (GAR) par activité.",
      icon: FileText,
      badge: "PDF",
      badgeClass: "bg-destructive text-destructive-foreground",
      params: "budget-livrables",
      action: async () => {
        const { generateRapportActivite } = await import("@/lib/reports/generateRapportActivite");
        await generateRapportActivite({
          type: "annuel",
          exercice: parseInt(annee),
          activiteId: activiteFilter !== "all" ? activiteFilter : undefined,
        });
      },
    },
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Rapports</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Exercice :</label>
          <Select value={annee} onValueChange={setAnnee}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exercices.length > 0
                ? exercices.map((e) => (
                    <SelectItem key={e.id} value={String(e.annee)}>
                      {e.annee}
                    </SelectItem>
                  ))
                : [2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <r.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{r.title}</CardTitle>
                <Badge className={r.badgeClass}>{r.badge}</Badge>
              </div>
              <CardDescription className="text-xs">{r.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end gap-3">
              {(r.params === "mensuel") && (
                <>
                  <Select value={mois} onValueChange={setMois}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {moisOptions.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={activiteFilter} onValueChange={setActiviteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Activité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les activités</SelectItem>
                      {activitesList.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {(r.params === "trimestriel") && (
                <>
                  <Select value={trimestre} onValueChange={setTrimestre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">T1 (Jan-Mar)</SelectItem>
                      <SelectItem value="2">T2 (Avr-Jun)</SelectItem>
                      <SelectItem value="3">T3 (Jul-Sep)</SelectItem>
                      <SelectItem value="4">T4 (Oct-Déc)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={activiteFilter} onValueChange={setActiviteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Activité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les activités</SelectItem>
                      {activitesList.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {r.params === "budget-livrables" && (
                <Select value={activiteFilter} onValueChange={setActiviteFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Activité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les activités</SelectItem>
                    {activitesList.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={() => generate(r.key, r.action)}
                disabled={generating[r.key]}
                className="w-full"
              >
                {generating[r.key] ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Générer et télécharger
                  </>
                )}
              </Button>

              {lastGenerated[r.key] && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Dernier export : {lastGenerated[r.key]}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const Rapports = () => (
  <RequirePermission module={MODULES.RAPPORTS}>
    <RapportsContent />
  </RequirePermission>
);

export default Rapports;
