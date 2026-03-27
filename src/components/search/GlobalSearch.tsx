import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  type: "activite" | "tache" | "sous_tache";
  code: string;
  libelle: string;
  url: string;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: results = [] } = useQuery<SearchResult[]>({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const q = query.toLowerCase();
      const [{ data: acts }, { data: taches }, { data: sts }] = await Promise.all([
        supabase.from("activites").select("code, libelle").or(`code.ilike.%${q}%,libelle.ilike.%${q}%`).limit(5),
        supabase.from("taches").select("code, libelle").or(`code.ilike.%${q}%,libelle.ilike.%${q}%`).limit(5),
        supabase.from("sous_taches").select("code, libelle").or(`code.ilike.%${q}%,libelle.ilike.%${q}%`).limit(5),
      ]);
      return [
        ...(acts || []).map((a) => ({ type: "activite" as const, code: a.code, libelle: a.libelle, url: "/pta" })),
        ...(taches || []).map((t) => ({ type: "tache" as const, code: t.code, libelle: t.libelle, url: "/pta" })),
        ...(sts || []).map((s) => ({ type: "sous_tache" as const, code: s.code, libelle: s.libelle, url: "/execution" })),
      ];
    },
    enabled: query.length >= 2,
  });

  const typeLabels: Record<string, string> = {
    activite: "Activité",
    tache: "Tâche",
    sous_tache: "Sous-tâche",
  };

  const typeColors: Record<string, string> = {
    activite: "bg-primary text-primary-foreground",
    tache: "bg-secondary text-secondary-foreground",
    sous_tache: "bg-accent text-accent-foreground",
  };

  const handleSelect = (r: SearchResult) => {
    navigate(r.url);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 text-muted-foreground text-xs hover:bg-muted transition"
      >
        <Search className="h-3 w-3" />
        <span className="hidden sm:inline">Rechercher...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par code ou libellé..."
              className="border-0 focus-visible:ring-0 text-sm"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[300px]">
            {query.length < 2 ? (
              <p className="text-center text-muted-foreground text-xs py-6">Tapez au moins 2 caractères</p>
            ) : results.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-6">Aucun résultat pour « {query} »</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.type}-${r.code}-${i}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition text-left"
                >
                  <Badge className={`text-[10px] ${typeColors[r.type]}`}>{typeLabels[r.type]}</Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground mr-2">{r.code}</span>
                    <span className="text-sm text-foreground truncate">{r.libelle}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
