import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const MODES = ["Régie", "Bon de commande", "Marché public", "Convention", "Subvention"];

interface Props {
  open: boolean;
  onClose: () => void;
  tacheId: string;
  tacheCode: string;
  tacheLibelle: string;
  actCode: string;
  actLibelle: string;
  onCreated: () => void;
}

const CreateSousTachePanel = ({ open, onClose, tacheId, tacheCode, tacheLibelle, actCode, actLibelle, onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [budget, setBudget] = useState("");
  const [mode, setMode] = useState("");
  const [sources, setSources] = useState("");
  const [responsable, setResponsable] = useState("");
  const [rh, setRh] = useState("");
  const [lignes, setLignes] = useState("");
  const [risques, setRisques] = useState("");
  const [mesures, setMesures] = useState("");
  const [t1, setT1] = useState(false);
  const [t2, setT2] = useState(false);
  const [t3, setT3] = useState(false);
  const [t4, setT4] = useState(false);

  const libelleErr = libelle.trim().length > 0 && libelle.trim().length < 5 ? "Minimum 5 caractères" : libelle.length > 300 ? "Maximum 300 caractères" : null;
  const canSave = libelle.trim().length >= 5 && !libelleErr && mode && !saving;

  const reset = () => {
    setLibelle(""); setBudget(""); setMode(""); setSources(""); setResponsable("");
    setRh(""); setLignes(""); setRisques(""); setMesures("");
    setT1(false); setT2(false); setT3(false); setT4(false);
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      const { data: newCode, error: codeErr } = await supabase.rpc("generate_sous_tache_code", { p_tache_id: tacheId });
      if (codeErr) throw codeErr;

      const { data: maxOrdre } = await supabase.from("sous_taches").select("ordre").eq("tache_id", tacheId).order("ordre", { ascending: false }).limit(1).maybeSingle();

      const budgetVal = parseInt(budget) || 0;
      const { error } = await supabase.from("sous_taches").insert({
        tache_id: tacheId, code: newCode, libelle: libelle.trim(),
        budget_prevu: budgetVal, mode_execution: mode,
        sources_financement: sources.trim() || null, responsable: responsable.trim() || null,
        ressources_humaines: rh.trim() || null, lignes_budgetaires: lignes.trim() || null,
        risques: risques.trim() || null, mesures_attenuation: mesures.trim() || null,
        trimestre_t1: t1, trimestre_t2: t2, trimestre_t3: t3, trimestre_t4: t4,
        ordre: (maxOrdre?.ordre ?? 0) + 1,
      });
      if (error) throw error;

      await supabase.from("journal_audit").insert({
        user_id: user.id, action: "CREATE", entite: "sous_tache",
        nouvelle_valeur: { code: newCode, libelle: libelle.trim(), budget: budgetVal, tache_code: tacheCode } as any,
      });

      toast({ title: `✅ Sous-tâche ${newCode} créée — Budget tâche mis à jour automatiquement` });
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Nouvelle sous-tâche</SheetTitle>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Tâche : {tacheCode} — {tacheLibelle}</p>
            <p>Activité : {actCode} — {actLibelle}</p>
            <p className="flex items-center gap-1"><Lock className="h-3 w-3" /> Code généré automatiquement</p>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Libellé de la sous-tâche *</Label>
              <span className={`text-xs ${libelle.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>{libelle.length}/300</span>
            </div>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={301} autoFocus />
            {libelleErr && <p className="text-xs text-destructive">{libelleErr}</p>}
          </div>

          <div className="space-y-1">
            <Label>Budget prévu (FCFA) *</Label>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min={0} />
            <p className="text-xs text-muted-foreground">ℹ️ Le budget de la tâche parente sera mis à jour automatiquement</p>
          </div>

          <div className="space-y-1">
            <Label>Mode d'exécution *</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1"><Label>Sources de financement</Label><Input value={sources} onChange={(e) => setSources(e.target.value)} /></div>
          <div className="space-y-1"><Label>Responsable</Label><Input value={responsable} onChange={(e) => setResponsable(e.target.value)} /></div>
          <div className="space-y-1"><Label>Ressources humaines</Label><Textarea value={rh} onChange={(e) => setRh(e.target.value)} rows={2} /></div>
          <div className="space-y-1"><Label>Lignes budgétaires</Label><Textarea value={lignes} onChange={(e) => setLignes(e.target.value)} rows={2} /></div>

          <div className="space-y-1 bg-amber-50 rounded-lg p-3">
            <Label>Risques identifiés</Label>
            <Textarea value={risques} onChange={(e) => setRisques(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1 bg-green-50 rounded-lg p-3">
            <Label>Mesures d'atténuation</Label>
            <Textarea value={mesures} onChange={(e) => setMesures(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Trimestres programmés</Label>
            <div className="flex gap-6">
              {([["T1", t1, setT1], ["T2", t2, setT2], ["T3", t3, setT3], ["T4", t4, setT4]] as const).map(([label, val, setter]) => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox checked={val} onCheckedChange={(c) => (setter as any)(!!c)} />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => { onClose(); reset(); }}>✕ Annuler</Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Créer la sous-tâche
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateSousTachePanel;
