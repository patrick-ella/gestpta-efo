import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AgentsProfilsTab from "@/components/objectifs/AgentsProfilsTab";
import ContratsTab from "@/components/objectifs/ContratsTab";
import EvaluationsTab from "@/components/objectifs/EvaluationsTab";

const ObjectifsEvaluation = () => {
  const [annee, setAnnee] = useState("2027");
  const [activeTab, setActiveTab] = useState("agents");

  const { data: exercices = [] } = useQuery({
    queryKey: ["exercices-obj"],
    queryFn: async () => {
      const { data } = await supabase.from("exercices").select("*").order("annee");
      return data || [];
    },
  });

  const selectedExercice = exercices.find((e) => e.annee === parseInt(annee));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Objectifs & Évaluation du personnel EFO</h1>
          <p className="text-sm text-muted-foreground">Gestion des contrats d'objectifs et évaluations annuelles du personnel</p>
        </div>
        <Select value={annee} onValueChange={setAnnee}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exercices.map((e) => (
              <SelectItem key={e.id} value={String(e.annee)}>{e.annee}</SelectItem>
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
          <ContratsTab exerciceId={selectedExercice?.id ?? null} exercice={parseInt(annee)} />
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <EvaluationsTab exerciceId={selectedExercice?.id ?? null} exercice={parseInt(annee)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ObjectifsEvaluation;
