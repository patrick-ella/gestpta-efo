import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

interface SousTacheDetailPanelProps {
  sousTache: SousTache | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onUpdate: () => void;
}

const fields: { key: keyof SousTache; label: string; type: "text" | "number" | "textarea" }[] = [
  { key: "code", label: "Code", type: "text" },
  { key: "libelle", label: "Libellé", type: "text" },
  { key: "budget_prevu", label: "Budget prévu (FCFA)", type: "number" },
  { key: "lignes_budgetaires", label: "Lignes budgétaires", type: "text" },
  { key: "mode_execution", label: "Mode d'exécution", type: "text" },
  { key: "sources_financement", label: "Sources de financement", type: "text" },
  { key: "responsable", label: "Responsable", type: "text" },
  { key: "ressources_humaines", label: "Ressources humaines", type: "text" },
  { key: "risques", label: "Risques", type: "textarea" },
  { key: "mesures_attenuation", label: "Mesures d'atténuation", type: "textarea" },
];

const trimestreKeys = [
  { key: "trimestre_t1" as const, label: "T1" },
  { key: "trimestre_t2" as const, label: "T2" },
  { key: "trimestre_t3" as const, label: "T3" },
  { key: "trimestre_t4" as const, label: "T4" },
];

const SousTacheDetailPanel = ({ sousTache, open, onClose, isAdmin, onUpdate }: SousTacheDetailPanelProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SousTache>>({});

  const startEdit = () => {
    if (sousTache) setFormData({ ...sousTache });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!sousTache) return;
    const { id, created_at, tache_id, ...rest } = formData as SousTache;
    const { error } = await supabase
      .from("sous_taches")
      .update(rest)
      .eq("id", sousTache.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Sous-tâche mise à jour." });
      onUpdate();
      setEditing(false);
    }
  };

  if (!sousTache) return null;

  const data = editing ? formData : sousTache;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditing(false); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {sousTache.code} — Détail de la sous-tâche
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {fields.map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm text-muted-foreground">{label}</Label>
              {editing ? (
                type === "textarea" ? (
                  <Textarea
                    value={String(data[key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    type={type === "number" ? "number" : "text"}
                    value={String(data[key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="text-sm"
                  />
                )
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {key === "budget_prevu" && data[key]
                    ? `${Number(data[key]).toLocaleString("fr-FR")} FCFA`
                    : String(data[key] ?? "—")}
                </p>
              )}
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Programmation trimestrielle</Label>
            <div className="flex gap-6">
              {trimestreKeys.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={!!(data as SousTache)?.[key]}
                    disabled={!editing}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, [key]: !!checked }))
                    }
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 pt-4 border-t">
              {editing ? (
                <>
                  <Button onClick={handleSave} size="sm">Sauvegarder</Button>
                  <Button onClick={() => setEditing(false)} variant="outline" size="sm">Annuler</Button>
                </>
              ) : (
                <Button onClick={startEdit} size="sm">Modifier</Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SousTacheDetailPanel;
