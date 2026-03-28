import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SousTacheLivrablesTab } from "@/components/livrables/SousTacheLivrablesTab";
import BudgetImpactPreview from "@/components/pta/BudgetImpactPreview";
import BudgetLinesTab from "@/components/budget/BudgetLinesTab";
import EditHistory from "@/components/pta/EditHistory";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Lock, Pencil, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import type { PtaActivite } from "@/hooks/usePtaData";

type SousTache = Database["public"]["Tables"]["sous_taches"]["Row"];

interface SousTacheDetailPanelProps {
  sousTache: SousTache | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onUpdate: () => void;
  tacheLivrables?: string | null;
  activites?: PtaActivite[];
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

const SousTacheDetailPanel = ({ sousTache, open, onClose, isAdmin, onUpdate, tacheLivrables, activites = [] }: SousTacheDetailPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editingLibelle, setEditingLibelle] = useState(false);
  const [libelleValue, setLibelleValue] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<SousTache>>({});

  const originalBudget = sousTache?.budget_prevu ?? 0;

  const startEdit = () => {
    if (sousTache) setFormData({ ...sousTache });
    setEditing(true);
  };

  const startEditLibelle = () => {
    if (sousTache) setLibelleValue(sousTache.libelle);
    setEditingLibelle(true);
  };

  const cancelEditLibelle = () => {
    if (libelleValue !== (sousTache?.libelle ?? "")) {
      setShowConfirm(true);
    } else {
      setEditingLibelle(false);
    }
  };

  const handleSaveLibelle = async () => {
    if (!sousTache || !user) return;
    const trimmed = libelleValue.trim();
    if (trimmed.length < 5) return;
    try {
      const { error } = await supabase.from("sous_taches").update({ libelle: trimmed }).eq("id", sousTache.id);
      if (error) throw error;
      await supabase.from("journal_audit").insert({
        user_id: user.id, action: "UPDATE", entite: "sous_tache",
        ancienne_valeur: { reference: sousTache.code, libelle: sousTache.libelle },
        nouvelle_valeur: { reference: sousTache.code, libelle: trimmed },
      });
      toast({ title: `✅ Sous-tâche ${sousTache.code} mise à jour` });
      setEditingLibelle(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!sousTache) return;
    const { id, created_at, tache_id, ...rest } = formData as SousTache;
    const { error } = await supabase.from("sous_taches").update(rest).eq("id", sousTache.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Sous-tâche mise à jour." });
      onUpdate();
      setEditing(false);
    }
  };

  const parentInfo = useMemo(() => {
    if (!sousTache || !activites.length) return null;
    for (const act of activites) {
      for (const t of act.taches) {
        if (t.id === sousTache.tache_id) {
          return { tacheCode: t.code, tacheLibelle: t.libelle, tacheBudget: t.budget_total ?? 0, actCode: act.code, actLibelle: act.libelle, actBudget: act.budget_total ?? 0 };
        }
      }
    }
    return null;
  }, [sousTache, activites]);

  if (!sousTache) return null;

  const data = editing ? formData : sousTache;
  const libelleError = editingLibelle && libelleValue.trim().length < 5 ? "Minimum 5 caractères requis" : libelleValue.length > 300 ? "Maximum 300 caractères" : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditing(false); setEditingLibelle(false); } }}>
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
            {/* Libelle edit section for admins */}
            {editingLibelle ? (
              <div className="border-2 border-primary rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Pencil className="h-4 w-4" /> Modification — Sous-tâche {sousTache.code}
                </div>
                {parentInfo && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Tâche parente : {parentInfo.tacheCode} — {parentInfo.tacheLibelle}</p>
                    <p>Activité : {parentInfo.actCode} — {parentInfo.actLibelle}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-sm text-muted-foreground">Libellé de la sous-tâche *</Label>
                    <span className={`text-xs ${libelleValue.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>{libelleValue.length}/300</span>
                  </div>
                  <Input value={libelleValue} onChange={(e) => setLibelleValue(e.target.value)}
                    className={libelleError ? "border-destructive" : "border-primary"} maxLength={301} autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEditLibelle();
                      if (e.key === "Enter") handleSaveLibelle();
                    }} />
                  {libelleError && <p className="text-xs text-destructive">{libelleError}</p>}
                </div>
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded p-2">
                  <div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Champs non modifiables ici</div>
                  <p>Code : {sousTache.code} 🔒</p>
                  <p>Budget prévu : {(sousTache.budget_prevu ?? 0).toLocaleString("fr-FR")} FCFA 🔒</p>
                  <p className="italic">Ces champs sont gérés dans l'onglet Exécution</p>
                </div>
                <EditHistory entite="sous_tache" code={sousTache.code} />
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={cancelEditLibelle}>✕ Annuler</Button>
                  <Button size="sm" onClick={handleSaveLibelle} disabled={!libelleValue.trim() || libelleValue.trim().length < 5 || libelleValue === sousTache.libelle}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Enregistrer
                  </Button>
                </div>
              </div>
            ) : null}

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
                    {key === "budget_prevu" && data[key] ? `${Number(data[key]).toLocaleString("fr-FR")} FCFA` : String(data[key] ?? "—")}
                  </p>
                )}
              </div>
            ))}

            {editing && (
              <BudgetImpactPreview sousTacheId={sousTache.id} tacheId={sousTache.tache_id}
                originalBudget={originalBudget} newBudget={Number(formData.budget_prevu ?? 0)} activites={activites} />
            )}

            {parentInfo && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Lock className="h-3 w-3" /> Budgets calculés automatiquement
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Tooltip><TooltipTrigger asChild>
                    <div className="flex items-center gap-1 bg-muted rounded px-2 py-1.5">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Tâche {parentInfo.tacheCode} :</span>
                      <span className="font-semibold text-foreground ml-auto">{parentInfo.tacheBudget.toLocaleString("fr-FR")} F</span>
                    </div>
                  </TooltipTrigger><TooltipContent>Ce budget est la somme des budgets de ses sous-tâches</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <div className="flex items-center gap-1 bg-muted rounded px-2 py-1.5">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Activité {parentInfo.actCode} :</span>
                      <span className="font-semibold text-foreground ml-auto">{parentInfo.actBudget.toLocaleString("fr-FR")} F</span>
                    </div>
                  </TooltipTrigger><TooltipContent>Ce budget est la somme des budgets de ses tâches</TooltipContent></Tooltip>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Programmation trimestrielle</Label>
              <div className="flex gap-6">
                {trimestreKeys.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox checked={!!(data as SousTache)?.[key]} disabled={!editing}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, [key]: !!checked }))} />
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
                  <div className="flex gap-2">
                    <Button onClick={startEdit} size="sm">Modifier tous les champs</Button>
                    {!editingLibelle && (
                      <Button onClick={startEditLibelle} variant="outline" size="sm">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier le libellé
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Livrables tab */}
          <TabsContent value="livrables" className="mt-4">
            <SousTacheLivrablesTab sousTacheId={sousTache.id} tacheId={sousTache.tache_id} tacheLivrables={tacheLivrables} />
          </TabsContent>

          {/* Risques tab */}
          <TabsContent value="risques" className="space-y-4 mt-4">
            {riskFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm text-muted-foreground">{label}</Label>
                {editing ? (
                  <Textarea value={String(data[key] ?? "")} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} className="text-sm" />
                ) : (
                  <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{String(data[key] ?? "—")}</p>
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

      <ConfirmDialog open={showConfirm} onOpenChange={setShowConfirm}
        title="⚠️ Modifications non enregistrées"
        description="Vous avez modifié le libellé sans enregistrer. Quitter quand même ?"
        onConfirm={() => { setShowConfirm(false); setEditingLibelle(false); }} />
    </Sheet>
  );
};

export default SousTacheDetailPanel;
