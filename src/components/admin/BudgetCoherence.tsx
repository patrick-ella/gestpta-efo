import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Wrench, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CoherenceRow {
  code: string;
  budget_activite: number;
  somme_taches: number;
  ecart: number;
}

function fmt(v: number) {
  return v.toLocaleString("fr-FR");
}

export const BudgetCoherence = () => {
  const qc = useQueryClient();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["budget-coherence"],
    queryFn: async () => {
      const { data: activites } = await supabase.from("activites").select("id, code, budget_total").order("code");
      const { data: taches } = await supabase.from("taches").select("id, activite_id, budget_total, code");
      const { data: sousTaches } = await supabase.from("sous_taches").select("id, tache_id, budget_prevu");

      const result: CoherenceRow[] = [];
      for (const act of activites ?? []) {
        const actTaches = (taches ?? []).filter(t => t.activite_id === act.id);
        // Also verify each tache vs its sous-taches
        let sommeTaches = 0;
        for (const t of actTaches) {
          const stSum = (sousTaches ?? [])
            .filter(st => st.tache_id === t.id)
            .reduce((s, st) => s + (st.budget_prevu ?? 0), 0);
          sommeTaches += stSum;
        }
        result.push({
          code: act.code,
          budget_activite: act.budget_total ?? 0,
          somme_taches: sommeTaches,
          ecart: (act.budget_total ?? 0) - sommeTaches,
        });
      }
      setLastCheck(new Date());
      return result;
    },
  });

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      // Trigger recalculation via a dummy update on each sous_tache
      // Actually we just need to call the edge function or do direct updates
      // Simplest: update each tache budget from sous_taches, then activites from taches
      const { data: taches } = await supabase.from("taches").select("id");
      for (const t of taches ?? []) {
        const { data: sts } = await supabase.from("sous_taches").select("budget_prevu").eq("tache_id", t.id);
        const sum = (sts ?? []).reduce((s, st) => s + (st.budget_prevu ?? 0), 0);
        await supabase.from("taches").update({ budget_total: sum }).eq("id", t.id);
      }
      const { data: activites } = await supabase.from("activites").select("id");
      for (const a of activites ?? []) {
        const { data: ts } = await supabase.from("taches").select("budget_total").eq("activite_id", a.id);
        const sum = (ts ?? []).reduce((s, t) => s + (t.budget_total ?? 0), 0);
        await supabase.from("activites").update({ budget_total: sum }).eq("id", a.id);
      }
      const { data: exercices } = await supabase.from("exercices").select("id");
      for (const e of exercices ?? []) {
        const { data: acts } = await supabase.from("activites").select("budget_total").eq("exercice_id", e.id);
        const sum = (acts ?? []).reduce((s, a) => s + (a.budget_total ?? 0), 0);
        await supabase.from("exercices").update({ budget_total: sum }).eq("id", e.id);
      }

      toast.success("Budgets recalculés avec succès");
      qc.invalidateQueries({ queryKey: ["pta-data"] });
      refetch();
    } catch {
      toast.error("Erreur lors du recalcul");
    } finally {
      setRecalculating(false);
    }
  };

  const total = rows.reduce((s, r) => ({ budget: s.budget + r.budget_activite, somme: s.somme + r.somme_taches }), { budget: 0, somme: 0 });
  const allOk = rows.every(r => r.ecart === 0);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Cohérence budgétaire</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Vérifier
            </Button>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wrench className="h-3.5 w-3.5 mr-1" />}
              Recalculer
            </Button>
          </div>
        </div>
        {lastCheck && (
          <p className="text-xs text-muted-foreground">Dernière vérification : {lastCheck.toLocaleString("fr-FR")}</p>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activité</TableHead>
              <TableHead className="text-right">Budget activité</TableHead>
              <TableHead className="text-right">Somme sous-tâches</TableHead>
              <TableHead className="text-right">Écart</TableHead>
              <TableHead className="text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-sm">{r.code}</TableCell>
                <TableCell className="text-right text-sm">{fmt(r.budget_activite)}</TableCell>
                <TableCell className="text-right text-sm">{fmt(r.somme_taches)}</TableCell>
                <TableCell className={`text-right text-sm font-semibold ${r.ecart !== 0 ? "text-destructive" : ""}`}>{fmt(r.ecart)}</TableCell>
                <TableCell className="text-center">
                  {r.ecart === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{fmt(total.budget)}</TableCell>
              <TableCell className="text-right">{fmt(total.somme)}</TableCell>
              <TableCell className={`text-right ${total.budget - total.somme !== 0 ? "text-destructive" : ""}`}>{fmt(total.budget - total.somme)}</TableCell>
              <TableCell className="text-center">
                {allOk ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
