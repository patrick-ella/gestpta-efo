import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Search, RotateCcw } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success text-success-foreground",
  UPDATE: "bg-accent text-accent-foreground",
  DELETE: "bg-destructive text-destructive-foreground",
};

export const AdminAudit = () => {
  const [filters, setFilters] = useState({ action: "all", entite: "all", search: "" });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const { data } = await supabase
        .from("journal_audit")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("users_profiles").select("id, nom, prenom, email");
      return data || [];
    },
  });

  const userName = (uid: string | null) => {
    if (!uid) return "Système";
    const p = profiles.find((pr: any) => pr.id === uid);
    return p ? `${p.prenom || ""} ${p.nom || ""}`.trim() || p.email : uid.slice(0, 8);
  };

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (filters.action !== "all" && l.action !== filters.action) return false;
      if (filters.entite !== "all" && l.entite !== filters.entite) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const vals = JSON.stringify(l).toLowerCase();
        if (!vals.includes(s)) return false;
      }
      return true;
    });
  }, [logs, filters]);

  const entites = [...new Set(logs.map((l: any) => l.entite).filter(Boolean))];

  const exportExcel = () => {
    const rows = filtered.map((l: any) => ({
      "Date/Heure": format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: fr }),
      Utilisateur: userName(l.user_id),
      Action: l.action,
      Entité: l.entite,
      "Ancienne valeur": JSON.stringify(l.ancienne_valeur),
      "Nouvelle valeur": JSON.stringify(l.nouvelle_valeur),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, "Journal d'audit");
    XLSX.writeFile(wb, "journal_audit.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-foreground">Journal d'audit</h2>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-1" />Exporter Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <label className="text-xs text-muted-foreground block mb-1">Action</label>
          <Select value={filters.action} onValueChange={(v) => setFilters((f) => ({ ...f, action: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="CREATE">Création</SelectItem>
              <SelectItem value="UPDATE">Modification</SelectItem>
              <SelectItem value="DELETE">Suppression</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <label className="text-xs text-muted-foreground block mb-1">Entité</label>
          <Select value={filters.entite} onValueChange={(v) => setFilters((f) => ({ ...f, entite: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {entites.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground block mb-1">Rechercher</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="pl-9" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFilters({ action: "all", entite: "all", search: "" })}>
          <RotateCcw className="h-4 w-4 mr-1" />Réinitialiser
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Heure</TableHead><TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead><TableHead>Entité</TableHead>
                <TableHead>Ancienne valeur</TableHead><TableHead>Nouvelle valeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune entrée</TableCell></TableRow>
              ) : filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                  <TableCell className="text-xs">{userName(l.user_id)}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${ACTION_COLORS[l.action] || ""}`}>{l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.entite}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{l.ancienne_valeur ? JSON.stringify(l.ancienne_valeur) : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{l.nouvelle_valeur ? JSON.stringify(l.nouvelle_valeur) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Affichage des 90 derniers jours — {filtered.length} entrées</p>
    </div>
  );
};
