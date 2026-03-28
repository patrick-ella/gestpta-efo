import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import type { NomenclatureLine } from "@/hooks/useBudgetLines";

interface Props {
  open: boolean;
  onClose: () => void;
  nomenclature: NomenclatureLine[];
  existingCodes: Set<string>;
  onConfirm: (selected: NomenclatureLine[]) => void;
}

const BudgetLineSelector = ({ open, onClose, nomenclature, existingCodes, onConfirm }: Props) => {
  const [search, setSearch] = useState("");
  const [famille, setFamille] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const familles = useMemo(() => {
    const set = new Set(nomenclature.map((n) => n.famille).filter(Boolean));
    return Array.from(set) as string[];
  }, [nomenclature]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return nomenclature.filter((n) => {
      if (famille !== "all" && n.famille !== famille) return false;
      if (q && !n.code.toLowerCase().includes(q) && !n.libelle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [nomenclature, search, famille]);

  const toggle = (id: string) => {
    if (existingCodes.has(nomenclature.find((n) => n.id === id)?.code ?? "")) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const items = nomenclature.filter((n) => selected.has(n.id));
    onConfirm(items);
    setSelected(new Set());
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sélectionner une ligne budgétaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code ou libellé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={famille} onValueChange={setFamille}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Famille" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les familles</SelectItem>
              {familles.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 max-h-[400px] border rounded-md">
          <div className="p-1">
            {filtered.map((n) => {
              const isExisting = existingCodes.has(n.code);
              const isChecked = isExisting || selected.has(n.id);
              return (
                <label
                  key={n.id}
                  className={`flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent/50 ${isExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={(e) => { if (isExisting) e.preventDefault(); }}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isExisting}
                    onCheckedChange={() => toggle(n.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-muted-foreground">{n.code}</span>
                    <p className="text-sm text-foreground leading-tight">{n.libelle}</p>
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Ajouter {selected.size} ligne(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetLineSelector;
