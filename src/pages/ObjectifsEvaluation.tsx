import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveExercice } from "@/hooks/useActiveExercice";
import AgentsProfilsTab from "@/components/objectifs/AgentsProfilsTab";
import ContratsTab from "@/components/objectifs/ContratsTab";
import EvaluationsTab from "@/components/objectifs/EvaluationsTab";
import { Loader2 } from "lucide-react";

const ObjectifsEvaluation = () => {
  const [selectedAnnee, setSelectedAnnee] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("agents");

  const { data: activeExercice, isLoading: exerciceLoading } = useActiveExercice();

  const { data: exercices = [] } = useQuery({
    queryKey: ["exercices-obj"],
    queryFn: async () => {
      const { data } = await supabase.from("exercices").select("*").order("annee");
      return data || [];
    },
  });

  // Auto-select active exercice once loaded
  useEffect(() => {
    if (activeExercice && !selectedAnnee) {
      setSelectedAnnee(String(activeExercice.annee));
    }
  }, [activeExercice, selectedAnnee]);

  const resolvedAnnee = selectedAnnee ?? (activeExercice ? String(activeExercice.annee) : null);
  const selectedExercice = resolvedAnnee ? exercices.find((e) => e.annee === parseInt(resolvedAnnee)) : null;

  if (exerciceLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Chargement de l'exercice actif...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Objectifs & Évaluation du personnel EFO</h1>
          <p className="text-sm text-muted-foreground">Gestion des contrats d'objectifs et évaluations annuelles du personnel</p>
        </div>
        <Select value={resolvedAnnee ?? ""} onValueChange={setSelectedAnnee}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exercices.map((e) => (
              <SelectItem key={e.id} value={String(e.annee)}>
                {e.annee}{e.statut === "actif" ? " (actif)" : e.statut === "en_cours" ? " (en cours)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">👤 Personnel EFO</TabsTrigger>
          <TabsTrigger value="contrats">📋 Contrats d'Objectifs</TabsTrigger>
          <TabsTrigger value="evaluations">⭐ Évaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <AgentsProfilsTab exerciceId={selectedExercice?.id ?? null} />
        </TabsContent>

        <TabsContent value="contrats" className="mt-4">
          <ContratsTab exerciceId={selectedExercice?.id ?? null} exercice={parseInt(resolvedAnnee ?? "0")} />
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <EvaluationsTab exerciceId={selectedExercice?.id ?? null} exercice={parseInt(resolvedAnnee ?? "0")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ObjectifsEvaluation;
