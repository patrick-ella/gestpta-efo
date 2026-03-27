import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Users, ListTodo, Activity, Database } from "lucide-react";
import { toast } from "sonner";

export const AdminMaintenance = () => {
  const [exporting, setExporting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, sousTaches, executions] = await Promise.all([
        supabase.from("users_profiles").select("id", { count: "exact", head: true }),
        supabase.from("sous_taches").select("id", { count: "exact", head: true }),
        supabase.from("executions").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        sousTaches: sousTaches.count || 0,
        executions: executions.count || 0,
      };
    },
  });

  const exportAll = async () => {
    setExporting(true);
    try {
      const tables = ["exercices", "activites", "taches", "sous_taches", "executions", "livrables", "indicateurs_kpi", "journal_audit"] as const;
      const backup: Record<string, any> = { exported_at: new Date().toISOString() };

      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backup[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_gestpta_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sauvegarde exportée avec succès");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: "Utilisateurs", value: stats?.users ?? "—", icon: Users },
    { label: "Sous-tâches", value: stats?.sousTaches ?? "—", icon: ListTodo },
    { label: "Exécutions", value: stats?.executions ?? "—", icon: Activity },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Sauvegarde et maintenance</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent"><s.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={exportAll} disabled={exporting} className="w-full sm:w-auto">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Exporter toutes les données (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
