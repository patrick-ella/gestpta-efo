import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw } from "lucide-react";
import type { PtaActivite } from "@/hooks/usePtaData";

export interface ExecutionFilters {
  activiteId: string;
  responsable: string;
  statut: string;
  trimestre: string;
  search: string;
}

const defaultFilters: ExecutionFilters = {
  activiteId: "",
  responsable: "",
  statut: "",
  trimestre: "",
  search: "",
};

interface FilterBarProps {
  activites: PtaActivite[];
  filters: ExecutionFilters;
  onChange: (f: ExecutionFilters) => void;
}

const statutOptions = [
  { value: "non_demarre", label: "Non démarré" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "suspendu", label: "Suspendu" },
  { value: "annule", label: "Annulé" },
];

const ExecutionFilterBar = ({ activites, filters, onChange }: FilterBarProps) => {
  const responsables = useMemo(() => {
    const set = new Set<string>();
    activites.forEach((a) =>
      a.taches.forEach((t) =>
        t.sous_taches.forEach((st) => {
          if (st.responsable) set.add(st.responsable);
        })
      )
    );
    return Array.from(set).sort();
  }, [activites]);

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par code ou libellé…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={filters.activiteId}
        onValueChange={(v) => onChange({ ...filters, activiteId: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Activité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les activités</SelectItem>
          {activites.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.code} — {a.libelle.slice(0, 30)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.responsable}
        onValueChange={(v) => onChange({ ...filters, responsable: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Responsable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {responsables.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.statut}
        onValueChange={(v) => onChange({ ...filters, statut: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          {statutOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.trimestre}
        onValueChange={(v) => onChange({ ...filters, trimestre: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue placeholder="Trimestre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="t1">T1</SelectItem>
          <SelectItem value="t2">T2</SelectItem>
          <SelectItem value="t3">T3</SelectItem>
          <SelectItem value="t4">T4</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => onChange(defaultFilters)}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
};

export { defaultFilters };
export default ExecutionFilterBar;
