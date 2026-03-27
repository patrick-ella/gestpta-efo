import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";
import type { ActiviteGrouped } from "@/hooks/useLivrablesData";

interface Props {
  activites: ActiviteGrouped[];
  filters: { activite: string; statut: string; search: string };
  onChange: (f: Partial<Props["filters"]>) => void;
  onReset: () => void;
}

export const LivrablesFilterBar = ({ activites, filters, onChange, onReset }: Props) => (
  <div className="flex flex-wrap gap-3 items-end">
    <div className="flex-1 min-w-[200px]">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">Rechercher</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un livrable..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-9"
        />
      </div>
    </div>
    <div className="min-w-[180px]">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">Activité</label>
      <Select value={filters.activite} onValueChange={(v) => onChange({ activite: v })}>
        <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les activités</SelectItem>
          {activites.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.code} - {a.libelle}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="min-w-[150px]">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
      <Select value={filters.statut} onValueChange={(v) => onChange({ statut: v })}>
        <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="produit">Produit</SelectItem>
          <SelectItem value="non_produit">Non produit</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Button variant="outline" size="sm" onClick={onReset}>
      <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
    </Button>
  </div>
);
