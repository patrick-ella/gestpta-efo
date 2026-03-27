import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SousTacheLivrablesTab } from "@/components/livrables/SousTacheLivrablesTab";
import type { Database } from "@/integrations/supabase/types";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

interface SousTacheDetailPanelProps {
  sousTache: SousTache | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onUpdate: () => void;
  tacheLivrables?: string | null;
}

const detailFields: { key: keyof SousTache; label: string; type: "text" | "number" | "textarea" }[] = [
  { key: "code", label: "Code", type: "text" },
  { key: "libelle", label: "Libellé", type: "text" },
  { key: "budget_prevu", label: "Budget prévu (FCFA)", type: "number" },
  { key: "lignes_budgetaires", label: "Lignes budgétaires", type: "text" },
  { key: "mode_execution", label: "Mode d'exécution", type: "text" },
  { key: "sources_financement", label: "Sources de financement", type: "text" },
  { key: "responsable", label: "Responsable", type: "text" },
  { key: "ressources_humaines", label: "Ressources humaines", type: "text" },
];

const riskFields: { key: keyof SousTache; label: string }[] = [
  { key: "risques", label: "Risques" },
  { key: "mesures_attenuation", label: "Mesures d'atténuation" },
];

const trimestreKeys = [
  { key: "trimestre_t1" as const, label: "T1" },
  { key: "trimestre_t2" as const, label: "T2" },
  { key: "trimestre_t3" as const, label: "T3" },
  { key: "trimestre_t4" as const, label: "T4" },
];

const SousTacheDetailPanel = ({ sousTache, open, onClose, isAdmin, onUpdate, tacheLivrables }: SousTacheDetailPanelProps) => {
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

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details">📋 Détails</TabsTrigger>
            <TabsTrigger value="livrables">📦 Livrables</TabsTrigger>
            <TabsTrigger value="risques">⚠️ Risques</TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {detailFields.map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm text-muted-foreground">{label}</Label>
                {editing ? (
                  <Input
                    type={type === "number" ? "number" : "text"}
                    value={String(data[key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="text-sm"
                  />
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
          </TabsContent>

          {/* Livrables tab */}
          <TabsContent value="livrables" className="mt-4">
            <SousTacheLivrablesTab
              sousTacheId={sousTache.id}
              tacheId={sousTache.tache_id}
              tacheLivrables={tacheLivrables}
            />
          </TabsContent>

          {/* Risques tab */}
          <TabsContent value="risques" className="space-y-4 mt-4">
            {riskFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm text-muted-foreground">{label}</Label>
                {editing ? (
                  <Textarea
                    value={String(data[key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                    {String(data[key] ?? "—")}
                  </p>
                )}
              </div>
            ))}

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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default SousTacheDetailPanel;
