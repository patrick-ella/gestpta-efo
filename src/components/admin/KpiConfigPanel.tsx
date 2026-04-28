import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Play, Loader2, X } from "lucide-react";

interface Badge {
  id: string;
  code: string;
  label: string;
  icon: string | null;
  type_calcul: string;
}

interface VariableRow {
  id?: string;
  variable_index: number;
  extrant_id: string;
  critere_id: string;
  label_variable: string;
}

interface SeuilCondition {
  variable_index: number;
  min_value: number;
}

interface SeuilRow {
  id?: string;
  ordre: number;
  label_statut: string;
  icon_statut: string;
  couleur: string;
  bg_couleur: string;
  conditions: SeuilCondition[];
}

interface Props {
  badge: Badge;
  open: boolean;
  onClose: () => void;
}

export default function KpiConfigPanel({ badge, open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [variables, setVariables] = useState<VariableRow[]>([]);
  const [seuils, setSeuils] = useState<SeuilRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTest, setShowTest] = useState(false);

  // Load existing variables + seuils for this badge
  const { data: existing, isLoading } = useQuery({
    queryKey: ["kpi_config", badge.id, open],
    queryFn: async () => {
      const [vars, seu] = await Promise.all([
        supabase
          .from("kpi_variables" as any)
          .select("*")
          .eq("kpi_badge_id", badge.id)
          .order("variable_index"),
        supabase
          .from("kpi_seuils" as any)
          .select("*")
          .eq("kpi_badge_id", badge.id)
          .order("ordre"),
      ]);
      return {
        variables: (vars.data ?? []) as any[],
        seuils: (seu.data ?? []) as any[],
      };
    },
    enabled: open,
    staleTime: 0,
  });

  // Load extrants + criteria for selectors
  const { data: extrants = [] } = useQuery({
    queryKey: ["extrants_for_kpi"],
    queryFn: async () => {
      const { data } = await supabase
        .from("extrants")
        .select(
          `id, reference, libelle, ordre,
           extrants_criteres ( id, libelle, type_critere, valeur_realisee )`
        )
        .order("ordre");
      return (data ?? []) as any[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!existing) return;
    setVariables(
      existing.variables.length
        ? existing.variables.map((v) => ({
            id: v.id,
            variable_index: v.variable_index,
            extrant_id: v.extrant_id,
            critere_id: v.critere_id,
            label_variable: v.label_variable ?? "",
          }))
        : [{ variable_index: 1, extrant_id: "", critere_id: "", label_variable: "" }]
    );
    setSeuils(
      existing.seuils.map((s) => ({
        id: s.id,
        ordre: s.ordre,
        label_statut: s.label_statut,
        icon_statut: s.icon_statut ?? "",
        couleur: s.couleur ?? "#1F4E79",
        bg_couleur: s.bg_couleur ?? "#EBF3FB",
        conditions: Array.isArray(s.conditions) ? s.conditions : [],
      }))
    );
  }, [existing]);

  function getCriteresForExtrant(extrantId: string) {
    const ext = extrants.find((e) => e.id === extrantId);
    return ((ext?.extrants_criteres ?? []) as any[]).filter(
      (c) => c.type_critere === "quantitatif"
    );
  }

  function updateVariable(idx: number, patch: Partial<VariableRow>) {
    setVariables((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function removeVariable(idx: number) {
    setVariables((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((v, i) => ({ ...v, variable_index: i + 1 }))
    );
  }
  function addVariable() {
    setVariables((prev) => [
      ...prev,
      { variable_index: prev.length + 1, extrant_id: "", critere_id: "", label_variable: "" },
    ]);
  }

  function updateSeuil(idx: number, patch: Partial<SeuilRow>) {
    setSeuils((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeSeuil(idx: number) {
    setSeuils((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordre: i })));
  }
  function addSeuil() {
    setSeuils((prev) => [
      ...prev,
      {
        ordre: prev.length,
        label_statut: "",
        icon_statut: "🏅",
        couleur: "#1F4E79",
        bg_couleur: "#EBF3FB",
        conditions: variables.map((v) => ({ variable_index: v.variable_index, min_value: 0 })),
      },
    ]);
  }
  function updateCondition(seuilIdx: number, varIndex: number, value: number) {
    setSeuils((prev) =>
      prev.map((s, i) => {
        if (i !== seuilIdx) return s;
        const conds = [...(s.conditions ?? [])];
        const ci = conds.findIndex((c) => c.variable_index === varIndex);
        if (ci >= 0) conds[ci] = { ...conds[ci], min_value: value };
        else conds.push({ variable_index: varIndex, min_value: value });
        return { ...s, conditions: conds };
      })
    );
  }

  function getCurrentValue(v: VariableRow): number {
    const c = getCriteresForExtrant(v.extrant_id).find((cr) => cr.id === v.critere_id);
    return Number(c?.valeur_realisee ?? 0);
  }

  const testActiveSeuil =
    showTest && variables.length > 0
      ? seuils.find((s) =>
          (s.conditions ?? []).every((cond) => {
            const v = variables.find((vv) => vv.variable_index === cond.variable_index);
            return v ? getCurrentValue(v) >= cond.min_value : false;
          })
        )
      : null;

  async function handleSave() {
    // Validate
    for (const v of variables) {
      if (!v.extrant_id || !v.critere_id) {
        toast.error("Chaque variable doit avoir un extrant et un critère sélectionnés.");
        return;
      }
    }
    for (const s of seuils) {
      if (!s.label_statut.trim()) {
        toast.error("Chaque niveau doit avoir un libellé.");
        return;
      }
    }
    setIsSaving(true);
    try {
      // Replace all
      await supabase.from("kpi_variables" as any).delete().eq("kpi_badge_id", badge.id);
      await supabase.from("kpi_seuils" as any).delete().eq("kpi_badge_id", badge.id);

      if (variables.length > 0) {
        const { error: ev } = await supabase.from("kpi_variables" as any).insert(
          variables.map((v, i) => ({
            kpi_badge_id: badge.id,
            variable_index: i + 1,
            extrant_id: v.extrant_id,
            critere_id: v.critere_id,
            label_variable: v.label_variable || null,
          }))
        );
        if (ev) throw ev;
      }
      if (seuils.length > 0) {
        const { error: es } = await supabase.from("kpi_seuils" as any).insert(
          seuils.map((s, i) => ({
            kpi_badge_id: badge.id,
            ordre: i,
            label_statut: s.label_statut,
            icon_statut: s.icon_statut || null,
            couleur: s.couleur,
            bg_couleur: s.bg_couleur,
            conditions: s.conditions,
          }))
        );
        if (es) throw es;
      }

      // Audit
      if (user?.id) {
        await supabase.from("journal_audit").insert({
          user_id: user.id,
          action: "UPDATE",
          entite: "kpi_connexion",
          nouvelle_valeur: {
            badge_code: badge.code,
            variables: variables.length,
            seuils: seuils.length,
          } as any,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["kpi_connexion", badge.code] });
      queryClient.invalidateQueries({ queryKey: ["kpi_badges_admin"] });
      toast.success(`✅ Connexion de "${badge.label}" enregistrée — effet immédiat`);
      onClose();
    } catch (err: any) {
      toast.error(`❌ ${err.message ?? "Erreur lors de l'enregistrement"}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{badge.icon}</span>
            <span>Configuration — {badge.label}</span>
          </SheetTitle>
          <SheetDescription>
            Type de calcul : <strong>{badge.type_calcul}</strong>. Configurez les
            variables sources puis les niveaux de statut (du plus élevé au plus bas).
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* VARIABLES */}
            <section>
              <h3 className="text-sm font-bold mb-2 text-foreground">
                Variables sources
              </h3>
              <div className="space-y-2">
                {variables.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        Variable {i + 1}
                      </span>
                      {variables.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariable(i)}
                          className="h-7 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Libellé</Label>
                      <Input
                        value={v.label_variable}
                        onChange={(e) =>
                          updateVariable(i, { label_variable: e.target.value })
                        }
                        placeholder="Ex : Miles totaux"
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Extrant source *</Label>
                      <Select
                        value={v.extrant_id}
                        onValueChange={(val) =>
                          updateVariable(i, { extrant_id: val, critere_id: "" })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue placeholder="-- Sélectionner un extrant --" />
                        </SelectTrigger>
                        <SelectContent>
                          {extrants.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.reference} — {e.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {v.extrant_id && (
                      <div>
                        <Label className="text-xs">Critère quantitatif *</Label>
                        <Select
                          value={v.critere_id}
                          onValueChange={(val) => updateVariable(i, { critere_id: val })}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue placeholder="-- Sélectionner un critère --" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCriteresForExtrant(v.extrant_id).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.libelle}
                                {c.valeur_realisee !== null
                                  ? ` (actuel : ${c.valeur_realisee})`
                                  : " (non renseigné)"}
                              </SelectItem>
                            ))}
                            {getCriteresForExtrant(v.extrant_id).length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                Aucun critère quantitatif sur cet extrant.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addVariable} className="mt-2 gap-1">
                <Plus className="h-3.5 w-3.5" /> Ajouter une variable
              </Button>
            </section>

            {/* SEUILS */}
            {badge.type_calcul === "seuils" && (
              <section>
                <h3 className="text-sm font-bold mb-2 text-foreground">
                  Niveaux de statut (du plus élevé au plus bas)
                </h3>
                <div className="space-y-2">
                  {seuils.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-md border-2 p-3 space-y-2"
                      style={{
                        borderColor: `${s.couleur}40`,
                        background: s.bg_couleur,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold"
                          style={{ color: s.couleur }}
                        >
                          Niveau {i + 1}
                          {i === 0 && " (le plus élevé)"}
                          {i === seuils.length - 1 && seuils.length > 1 && " (par défaut)"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSeuil(i)}
                          className="h-7 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-[60px_1fr] gap-2">
                        <div>
                          <Label className="text-[10px]">Icône</Label>
                          <Input
                            value={s.icon_statut}
                            onChange={(e) => updateSeuil(i, { icon_statut: e.target.value })}
                            className="h-8 text-center text-base mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Label *</Label>
                          <Input
                            value={s.label_statut}
                            onChange={(e) =>
                              updateSeuil(i, { label_statut: e.target.value })
                            }
                            placeholder="Ex : Full Gold"
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Couleur texte</Label>
                          <Input
                            type="color"
                            value={s.couleur}
                            onChange={(e) => updateSeuil(i, { couleur: e.target.value })}
                            className="h-8 mt-1 p-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Couleur fond</Label>
                          <Input
                            type="color"
                            value={s.bg_couleur}
                            onChange={(e) => updateSeuil(i, { bg_couleur: e.target.value })}
                            className="h-8 mt-1 p-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold">
                          Conditions (toutes doivent être remplies) :
                        </Label>
                        <div className="space-y-1.5 mt-1">
                          {variables.map((v) => {
                            const cond = (s.conditions ?? []).find(
                              (c) => c.variable_index === v.variable_index
                            );
                            return (
                              <div key={v.variable_index} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground min-w-[100px] truncate">
                                  {v.label_variable || `Variable ${v.variable_index}`} ≥
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={cond?.min_value ?? 0}
                                  onChange={(e) =>
                                    updateCondition(
                                      i,
                                      v.variable_index,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-7 w-24 text-sm"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addSeuil} className="mt-2 gap-1">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un niveau
                </Button>
              </section>
            )}

            {/* TEST */}
            <section>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTest((v) => !v)}
                className="gap-1"
              >
                <Play className="h-3.5 w-3.5" />
                {showTest ? "Masquer le test" : "Tester avec valeurs actuelles"}
              </Button>
              {showTest && (
                <div
                  className="mt-2 rounded-md p-3 border"
                  style={{
                    background: testActiveSeuil?.bg_couleur ?? "hsl(var(--muted))",
                    borderColor: testActiveSeuil?.couleur ?? "hsl(var(--border))",
                  }}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    ▶ Résultat avec les valeurs actuelles :
                  </p>
                  {variables.map((v) => (
                    <p key={v.variable_index} className="text-xs">
                      {v.label_variable || `Variable ${v.variable_index}`} :{" "}
                      <strong>{getCurrentValue(v)}</strong>
                    </p>
                  ))}
                  {badge.type_calcul === "seuils" ? (
                    <p
                      className="text-base font-extrabold mt-2"
                      style={{ color: testActiveSeuil?.couleur ?? "hsl(var(--foreground))" }}
                    >
                      {testActiveSeuil?.icon_statut}{" "}
                      {testActiveSeuil?.label_statut ?? "Aucun niveau atteint"}
                    </p>
                  ) : (
                    <p className="text-base font-extrabold mt-2 text-foreground">
                      {badge.type_calcul === "somme" &&
                        `Somme : ${variables.reduce((s, v) => s + getCurrentValue(v), 0)}`}
                      {badge.type_calcul === "moyenne" &&
                        `Moyenne : ${
                          variables.length
                            ? (
                                variables.reduce((s, v) => s + getCurrentValue(v), 0) /
                                variables.length
                              ).toFixed(2)
                            : 0
                        }`}
                      {badge.type_calcul === "valeur" &&
                        `Valeur : ${variables[0] ? getCurrentValue(variables[0]) : 0}`}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
